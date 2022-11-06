
import { reduce } from 'lodash';
import * as PIXI from 'pixi.js';

// Fixes a problem with live reload in the parcel bundler. See this issue: https://github.com/parcel-bundler/parcel/issues/289
declare let module: any;
if (module.hot) {
    module.hot.dispose(() => {
        window.location.reload();
    })
}

function initialPixiSetup(): PIXI.Container {
    const pixiContainer = document.querySelector("#pixi-container") as HTMLElement;
    const pixiApplication = new PIXI.Application({ resolution: window.devicePixelRatio, autoDensity: true, resizeTo: pixiContainer, antialias: true, backgroundColor: 0xFFFFFF });
    pixiApplication.renderer.plugins.interaction.autoPreventDefault = false;
    pixiApplication.renderer.view.style.touchAction = "auto";
    pixiContainer.appendChild(pixiApplication.view);
    const rootPixiContainer = new PIXI.Container();
    pixiApplication.stage.addChild(rootPixiContainer);
    return rootPixiContainer;
}

function createPIXIBox(): PIXI.Graphics {
    const boxSize = 100;
    const blueBoxGraphics = new PIXI.Graphics();
    blueBoxGraphics.beginFill(0x0000FF);
    blueBoxGraphics.drawRect(0, 0, boxSize, boxSize);
    blueBoxGraphics.endFill();
    return blueBoxGraphics;
}

type KeyEventData = {
    keyCode: string;
    keydownTimestampMS: number;
    keyupTimestampMS?: number;
};

const allKeyEvents: KeyEventData[] = [];
window.addEventListener('keydown', (e) => {
    if (e.repeat) {
        return;
    }
    allKeyEvents.push({
        keyCode: e.code,
        keydownTimestampMS: currentTime,
    });
});

window.addEventListener('keyup', (e) => {
    for (let i = allKeyEvents.length - 1; i >= 0; i--) {
        const keyEvent = allKeyEvents[i];
        if (keyEvent.keyCode === e.code) {
            keyEvent.keyupTimestampMS = currentTime;
            break;
        }
    }
});

let previousTime = 0;
const loop = (time: number): void => {
    const deltaTime = time - previousTime;
    previousTime = time;

    update(deltaTime);
    window.requestAnimationFrame(loop);
};
window.requestAnimationFrame(time => {
    previousTime = time;
    window.requestAnimationFrame(loop);
});


// for (let i = 0; i < 1000000; i++) {
//     allKeyEvents.push({
//         keyCode: Math.random() > 0.5 ? "KeyS" : "KeyD",
//         keydownTimestampMS: i / 1000,
//         keyupTimestampMS: (i + 1) / 1000
//     })
// }

const rootPixiContainer = initialPixiSetup();
const pixiBox = createPIXIBox();
rootPixiContainer.addChild(pixiBox);

let currentTime = 0;
function update(deltaTime: number): void {
    currentTime += deltaTime;
    const position = calculateRectanglePosition(currentTime, allKeyEvents, new PIXI.Point(0, 0));
    pixiBox.x = position.x;
    pixiBox.y = position.y;
}

function calculateRectanglePosition(currentTime: number, keyEvents: KeyEventData[], startingPositionAtBeginningOfGame: PIXI.Point): PIXI.Point {
    const velocity = 0.1;

    // This assumes key events are ordered by keyDownTimestamp

    const t0 = performance.now();

    // Procedural style
    const result = startingPositionAtBeginningOfGame.clone();
    for (const event of keyEvents) {
        const keyupTimeStamp = event.keyupTimestampMS ?? currentTime;
        const timeKeyWasHeld = keyupTimeStamp - event.keydownTimestampMS;
        const distanceToMove = velocity * timeKeyWasHeld;
        if (event.keyCode == "KeyW") {
            result.y -= distanceToMove;
        } else if (event.keyCode == "KeyA") {
            result.x -= distanceToMove;
        } else if (event.keyCode == "KeyS") {
            result.y += distanceToMove;
        } else if (event.keyCode == "KeyD") {
            result.x += distanceToMove;
        }
    }

    console.log(keyEvents.length, performance.now() - t0);
    return result;

    // Functional style
    // const reduced = keyEvents.map(event => {
    //     const positionChange = new PIXI.Point(0, 0);
    //     const keyupTimeStamp = event.keyupTimestampMS ?? currentTime;
    //     const timeKeyWasHeld = keyupTimeStamp - event.keydownTimestampMS;
    //     const distanceToMove = velocity * timeKeyWasHeld;
    //     if (event.keyCode == "KeyW") {
    //         positionChange.y -= distanceToMove;
    //     } else if (event.keyCode == "KeyA") {
    //         positionChange.x -= distanceToMove;
    //     } else if (event.keyCode == "KeyS") {
    //         positionChange.y += distanceToMove;
    //     } else if (event.keyCode == "KeyD") {
    //         positionChange.x += distanceToMove;
    //     }
    //     return positionChange;
    // }).reduce((prev, curr) => new PIXI.Point(prev.x + curr.x, prev.y + curr.y), startingPositionAtBeginningOfGame);
    // return reduced;



}

