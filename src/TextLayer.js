import loadingPage from './loading.html?raw';
import { disableBodyScroll, enableBodyScroll, clearAllBodyScrollLocks } from 'body-scroll-lock';

let TextLayer = function(startCallBack) {

    var divElement;
    let loader, start;
    disableBodyScroll(document.body);


    this.addButton = (text) => {
        start.className = 'start';
        loader.className = 'fadeout';
        start.onclick = ()=> {
            start.className = 'fadeout';
            document.getElementById('chrome').className += ' fadeout';
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
