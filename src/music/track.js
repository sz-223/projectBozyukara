const { getInfo } = require('ytdl-core');
const { AudioResource, createAudioResource, demuxProbe, StreamType } = require('@discordjs/voice');
const { exec } = require('youtube-dl-exec');
const { Converter } = require('ffmpeg-stream');

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
class Track {
  
	constructor(url, title, duration, loudnessDB, {onStart, onFinish, onError}) {
		this.url = url;
		this.title = title;
    this.duration = TimeConverter(duration);
    if(loudnessDB !== undefined)this.diffdB = - 30 - loudnessDB;
    else this.diffdB = - 30;
		this.onStart = onStart;
		this.onFinish = onFinish;
		this.onError = onError;
	}
  
	/**
	 * Creates an AudioResource from this Track.
	 */
  createAudioResource(){
		return new Promise((resolve, reject) => {
			const process_ = exec(
				this.url,
				{
					o: '-',
					q: '',
					f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
					r: '100K',
				},
				{ stdio: ['ignore', 'pipe', 'ignore'] },
			);
			if (!process_.stdout) {
				reject(new Error('No stdout'));
				return;
			}
      const stream = process_.stdout;
			const onError = (error) => {
				if (!process_.killed) process_.kill();
				stream.resume();
				reject(error);
			};
      
      const converter = new Converter();
      const input = converter.createInputStream({
        nostdin: true,
        f: "webm",
        acodec: "opus",
      });
			process_
				.once('spawn', () => {
					demuxProbe(stream)
						.then((probe) => {return new Promise((resolve2, reject2) => {
                probe.stream.pipe(input);
              console.log(`volume=-${this.diffdB}dB`);
              const streamOut = 
                converter
                  .createOutputStream({
                    f: "webm",
                    //timelimit: "20",
                    acodec: "opus",
                    af: `volume=${this.diffdB}dB`,
                    //ab: "48K",
                  })
                ;
              converter.run().then(
                  resolve2(resolve(createAudioResource(streamOut, { metadata: this, inputType: probe.type })))
                  ).catch(onError);
            });})
						.catch(onError);
				})
				.catch(onError);
		});
  }
}

	/**
	 * Creates a Track from a video URL and lifecycle callback methods.
	 *
	 * @param url The URL of the video
	 * @param methods Lifecycle callbacks
	 *
	 * @returns The created Track
	 */
	async function TrackFrom(url, methods){
	  let info;
    info = await getInfo(url);

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
      info.videoDetails.lengthSeconds,
      info.player_response.playerConfig.audioConfig.loudnessDb,
		  wrappedMethods,
		);
	}

function TimeConverter(duration){
  const sec = ("0" + duration % 60).slice(-2);
  let min = Math.floor(duration / 60);
  if (min < 60){
    min = ("0" + min).slice(-2);
    const rtn = `${min}:${sec}`;
    return rtn;
  }else{
    const hr = Math.floor(min / 60);
    min = min % 60;
    min = ("0" + min).slice(-2);
    const rtn = `${hr}:${min}:${sec}`;
    return rtn;
  }
}

module.exports = {
  Track: Track,
  TrackFrom: TrackFrom,
}