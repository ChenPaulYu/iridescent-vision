import loadingPage from './loading.html?raw';
import { disableBodyScroll, enableBodyScroll, clearAllBodyScrollLocks } from 'body-scroll-lock';

let TextLayer = function(startCallBack) {

    var divElement;
    let loader, start;
    disableBodyScroll(document.body);


    // Real load progress drives the seed's size — waiting reads as the
    // light gathering strength, not a frozen screen.
    this.setProgress = (p) => {
        const seed = document.getElementById('emberSeed');
        if (!seed) return;
        const clamped = Math.max(0, Math.min(1, p));
        const size = (4.5 + 6.5 * clamped).toFixed(2) + 'vmin';
        seed.style.width = size;
        seed.style.height = size;
    }

    this.addButton = (text) => {
        start.className = 'start';
        // Same ember from seed to invitation — it matures instead of
        // being swapped for a second element (which read as a flicker).
        const seed = document.getElementById('emberSeed');
        if (seed) {
            seed.style.width = '';
            seed.style.height = '';
            seed.className = 'ember ready';
        }
        start.onclick = ()=> {
            start.className = 'start fadeout';
            loader.className = 'loader fadeout'; // ignites the ember
            document.getElementById('chrome').className += ' fadeout';
            const voidEl = document.getElementById('void');
            if (voidEl) voidEl.className = 'fadeout';
            const titleEl = document.getElementById('titleBlock');
            if (titleEl) titleEl.className = 'fadeout';
            // Remove the whole overlay once faded so it never blocks
            // the canvas or pointer events.
            setTimeout(() => { divElement.style.display = 'none'; }, 1400);
            if (startCallBack) startCallBack();
        }
    }

    let init = () => {
        divElement = document.createElement('div');
        divElement.style.cssText = `
            margin: 0 auto;
            position: absolute;
            width: 100%;
            height: 100%;
            display:flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;`;
        document.body.appendChild(divElement);
        divElement.innerHTML = loadingPage;
        loader = divElement.getElementsByClassName('loader')[0];
        start = document.getElementById('start');
        //.className = "aClassName";
        console.log(loader);
    }

    init();
}


export {TextLayer};
