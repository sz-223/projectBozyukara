const { getInfo } = require('ytdl-core');
const { AudioResource, createAudioResource, demuxProbe, StreamType } = require('@discordjs/voice');
const { exec } = require('youtube-dl-exec');
var ffmpeg = require('fluent-ffmpeg');
const { Converter } = require('ffmpeg-stream');
//const ytdl = require("discord-ytdl-core");

/**
 * This is the data required to create a Track object.
 */
/*export class TrackData {
	url: string;
	title: string;
	onStart: () => void;
	onFinish: () => void;
	onError: (error: Error) => void;
}*/

//// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

/**
 * A Track represents information about a YouTube video (in this context) that can be added to a queue.
 * It contains the title and URL of the video, as well as functions onStart, onFinish, onError, that act
 * as callbacks that are triggered at certain points during the track's lifecycle.
 *
 * Rather than creating an AudioResource for each video immediately and then keeping those in a queue,
 * we use tracks as they don't pre-emptively load the videos. Instead, once a Track is taken from the
 * queue, it is converted into an AudioResource just in time for playback.
 */
class Track {// implements TrackData {
	/*public readonly url;//: string;
	public readonly title;//: string;
	public readonly onStart;//: () => void;
	public readonly onFinish;//: () => void;
	public readonly onError;//: (error: Error) => void;*/

	constructor(url, title, loudnessDB, {onStart, onFinish, onError}) {
		this.url = url;
		this.title = title;
    this.diffdB = - 30 - loudnessDB;
		this.onStart = onStart;
		this.onFinish = onFinish;
		this.onError = onError;
	}

	/**
	 * Creates an AudioResource from this Track.
	 */
  createAudioResource(){//: Promise<AudioResource<Track>> {
    console.log('check4');
		return new Promise((resolve, reject) => {
      console.log('check5');
			const process = exec(
				this.url,
				{
					o: '-',
					q: '',
					f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
					r: '100K',
				},
				{ stdio: ['ignore', 'pipe', 'ignore'] },
			);
      //console.log(process);
			if (!process.stdout) {
				reject(new Error('No stdout'));
				//return;
			}
			//const stream = process.stdout;
      const stream = process.stdout;
			const onError = (error) => {
				if (!process.killed) process.kill();
				//stream.resume();
				reject(error);
			};
			process
				.once('spawn', () => {
        console.log("check 7");        
        console.log(stream);
            /*ffmpeg(stream)
                  //.audioCodec('libopus')
                  .audioFilters('volume=0.5')
                  //.format('webm')
                  .on('error', (err) => console.error(err))
                  .on('end', () => console.log('Finished!'))
                  .pipe(streamOut => console.log(streamOut)//demuxProbe(streamOut).then(probe => resolve(createAudioResource(probe.stream, { metadata: this, inputType: probe.type }))).catch(onError)
                        , {
                    end: true
                });*/
					demuxProbe(stream)
						.then((probe) => {return new Promise((resolve2, reject2) => {
                //let streamOut;
                console.log("check 9");
                //console.log(probe.stream);
                const converter = new Converter();
                const input = converter.createInputStream({
                  f: "webm",
                  acodec: "opus",
                });
                probe.stream.pipe(input);
            console.log(`volume=-${this.diffdB}dB`);
            const streamOut = 
                converter
                  .createOutputStream({
                    f: "webm",
                    acodec: "opus",
                    af: `volume=${this.diffdB}dB`,
                  })
                ;
            converter.run().then(
                  resolve2(resolve(createAudioResource(streamOut, { metadata: this, inputType: probe.type })))
                  );
            /*probe.stream.on('data', () =>
                resolve2(ffmpeg()
                  .input(probe.stream)
                  .inputFormat('webm')
                  .withAudioCodec('libopus')
                  .addOption('-af "volume=0.5"')
                  //.audioFilters('volume=0.5')
                  .toFormat('webm')
                  //.format('webm')
                  .on('error', (err) => console.error(err))
                  .on('end', () => console.log('Finished!'))
                  .pipe(streamOut => resolve(createAudioResource(streamOut, { metadata: this, inputType: probe.type })), {
                    end: true
                })));*/
                //console.log(streamOut);
                //resolve2(resolve(createAudioResource(streamOut, { metadata: this, inputType: probe.type })));
            });})
						.catch(onError);
          //demuxProbe(stream).then(probe => Promise.resolve(createAudioResource(probe.stream, { /*metadata: this, inputType: probe.type })))
          //.then(console.log(resource))
          //Promise.resolve(createAudioResource(probe.stream, { /*metadata: this, inputType: probe.type }));
				})
				.catch(onError);
		});
  }
}
  /*createAudioResource(){//: Promise<AudioResource<Track>> {
			const process = exec(
				this.url,
				{
					o: '-',
					q: '',
					f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
					r: '100K',
				},
				{ stdio: ['ignore', 'pipe', 'ignore'] },
			);
      //console.log(process);
			if (!process.stdout) {
				console.warn('No stdout');
				return;
			}
			const stream = process.stdout;
			const onError = (error) => {
				if (!process.killed) process.kill();
				stream.resume();
				console.warn(error);
        return;
			};
			process
				.once('spawn', async () => {
					let resource;
          demuxProbe(stream).then(probe => resource = (createAudioResource(probe.stream, { /*metadata: this, inputType: probe.type })))
          .then(console.log(resource))
				})
				.catch(onError);
	}*/

	/**
	 * Creates a Track from a video URL and lifecycle callback methods.
	 *
	 * @param url The URL of the video
	 * @param methods Lifecycle callbacks
	 *
	 * @returns The created Track
	 */
	async function TrackFrom(url/*: string*/, methods/*: Pick<Track, 'onStart' | 'onFinish' | 'onError'>*/){//: Promise<Track> {
		const info = await getInfo(url);

		// The methods are wrapped so that we can ensure that they are only called once.
		const wrappedMethods = {
			onStart() {
				wrappedMethods.onStart = noop;
				methods.onStart();
			},
			onFinish() {
				wrappedMethods.onFinish = noop;
				methods.onFinish();
			},
			onError(error) {
				wrappedMethods.onError = noop;
				methods.onError(error);
			},
		};

		return new Track(
      url,
			info.videoDetails.title,
      info.player_response.playerConfig.audioConfig.loudnessDb,
		  wrappedMethods,
		);
	}


module.exports = {
  Track: Track,
  TrackFrom: TrackFrom,
}