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
    // The music breathes in with the ember-ignite / canvas focus-in
    // (~2.5s) instead of slamming on. Transport timing is untouched —
    // only the bgm's amplitude envelope.
    player.fadeIn = 2.8;
    //players.push(player);
    this.playBG = () => {
        startTime = Tone.context.currentTime;
        console.log('playBG');
        player.start();
    }

    this.schedule = (f, min, sec) => {
        
        Tone.Transport.schedule(f, String(min*60+sec));
    }
    
    this.scheduleToneTime = (f, time) => {
        Tone.Transport.schedule(f, time-Tone.context.currentTime+startTime);
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