import {dataService} from "./dataService";

var actionService = {
    doAction: function (gridId, gridElementId) {
        dataService.getGridElement(gridId, gridElementId).then(gridElement => {
            console.log('do action for: ' + JSON.stringify(gridElement));
            if(typeof SpeechSynthesisUtterance !== 'undefined') {
                var msg = new SpeechSynthesisUtterance(gridElement.label);
                window.speechSynthesis.speak(msg);
            }
        });
    }
};

export {actionService};