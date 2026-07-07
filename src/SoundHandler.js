import Tone from 'tone';
import bgm from './sounds/bgm.mp3';

let SoundHandler = function(onProgress){
    Tone.context.lookAhead = 0;
    this.onProgress = onProgress;
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.has('mute') || params.has('silent')) {
            Tone.Master.mute = true;
        }
        if (typeof window !== 'undefined') {
            window.__Tone = Tone;
        }
    } catch (e) { /* SSR or unusual env */ }
    var loaded = 0;
    var startTime;
    //var players = [];
    var player = new Tone.Player(bgm, function(){
        // console.log('bgm ready!');
        //player.sync().start(0);
        loaded += 1;
        onProgress(loaded);
    }).toMaster();
    //players.push(player);
    this.playBG = () => {
        startTime = Tone.context.currentTime;
        console.log('playBG');
        player.start();
    }

    // Every timeline cue is also recorded here so the debug UI can jump:
    // seeking Tone.Transport forward SKIPS scheduled events, so a jump
    // has to replay the skipped cues manually to rebuild scene state.
    // Cues register in a CASCADE (a firing cue schedules the next stage),
    // so replaying a cue can add new entries — the replayer iterates.
    // Dedupe by time: a manual replay may re-run a registering cue whose
    // children are already scheduled; without the guard they'd fire twice.
    // Each cue tracks whether it has actually run (naturally via the
    // transport OR manually via a debug replay) — the replayer plays
    // every unfired cue up to the jump target, so it never depends on
    // guessing from the current transport position.
    this.cues = [];
    let registerCue = (f, time) => {
        if (this.cues.some((c) => Math.abs(c.time - time) < 0.001)) return null;
        const cue = { time: time, fn: f, fired: false };
        this.cues.push(cue);
        return cue;
    }

    this.schedule = (f, min, sec) => {
        const cue = registerCue(f, min * 60 + sec);
        if (!cue) return;
        Tone.Transport.schedule(() => { cue.fired = true; f(); }, String(min*60+sec));
    }

    // Debug-only: move the transport AND the bgm together (the bgm player
    // is started free-running, not synced to the transport, so seeking
    // the transport alone would desync the music).
    this.seek = (sec) => {
        Tone.Transport.seconds = sec;
        try {
            player.stop();
            player.start(undefined, sec);
        } catch (e) {
            console.warn('bgm seek failed', e);
        }
    }
    
    this.scheduleToneTime = (f, time) => {
        // `time` is intended as seconds-from-piece-start (playBG runs at
        // transport 0), so it doubles as the cue's transport time.
        const cue = registerCue(f, time);
        if (!cue) return;
        Tone.Transport.schedule(() => { cue.fired = true; f(); }, time-Tone.context.currentTime+startTime);
    }

    this.consoleNow = () => {
        console.log('now', Tone.context.currentTime);
    }

    this.loadPlayer = (soundPlayer, fadeout = 0) => {
        console.log('loadPlayer:', soundPlayer.length);
        let playerList = [];
        soundPlayer.forEach((e) => {
            let p = new Tone.Player(e, () => {
                loaded += 1;
                this.onProgress(loaded);
            }).toMaster();
            p.fadeOut = fadeout;
            playerList.push(p);
            
        })
        //players.concat(playerList);
        return playerList;
    }

    this.calcLoadingPercentage = () => {
		//if (loading === 1.) return;
		//let loaded = 0;
		// players.forEach((e) => {
		// 	if (e.loaded) loaded++;
		// });
        //loading = Math.floor(100*loaded/players.length);
        //return loading;
	}

    this.start = () => {
        Tone.Transport.start();
    }

    window.addEventListener('keydown', (e) => {  
        if(e.code === 'KeyP')  {
            e.preventDefault();
            this.start();
        }
    }, false);
}

export {SoundHandler};