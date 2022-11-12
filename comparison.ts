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

function createPIXIBox(width: number, height: number, fillColor: number | undefined = 0x000000): PIXI.Graphics {
    const box = new PIXI.Graphics();
    box.beginFill(fillColor);
    box.lineStyle(1, 0x000000, 1);
    box.drawRect(0, 0, width, height);
    box.endFill();
    return box;
}

const rootPixiContainer = initialPixiSetup();
const playAreaWidth = 100;
const playAreaHeight = 100;
const playArea = createPIXIBox(playAreaWidth, playAreaHeight, 0xFFFFFF);
playArea.x = 100;
playArea.y = 100;
rootPixiContainer.addChild(playArea);

const playhead = new PIXI.Graphics();
playhead.lineStyle(1, 0xFF0000, 1.0);
playhead.moveTo(-20, 0);
playhead.lineTo(playAreaWidth + 20, 0);
playArea.addChild(playhead);

// Start shared code
const velocity = 0.05;
// End shared code

// Start Procedural
// function updateProcedural(deltaTime: number): void {
//     playhead.y += deltaTime * velocity;
//     if (playhead.y > playAreaHeight) {
//         playhead.y = playhead.y - playAreaHeight;
//     }
// }
// End Procedural

// Start OOTTP
type EventData = EventDataUpdate;

type EventDataUpdate = {
    eventType: "update",
    data: {
        deltaTime: number,
    }
};

type OutputData = {
    playheadY: number,
};

const events: EventData[] = [];
function updateOOTTP(deltaTime: number): void {
    events.push({
        eventType: "update",
        data: {
            deltaTime: deltaTime,
        }
    });

    const outputData = calculateOOTTPInputToOutputData(events);
    renderOOTTP(outputData);
}

function calculateOOTTPInputToOutputData(events: EventData[]): OutputData {
    
    let playheadY = 0;
    for (const event of events) {
        if (event.eventType === "update") {
            playheadY += event.data.deltaTime * velocity;
            if (playheadY > playAreaHeight) {
                playheadY = playheadY - playAreaHeight;
            }
        }
    }
    return {
        playheadY: playheadY,
    }
}

function renderOOTTP(outputData: OutputData): void {
    // "Render"
    playhead.y = outputData.playheadY;
}
// End OOTTP


let previousTime = 0;
const loop = (time: number): void => {

    const deltaTime = time - previousTime;
    previousTime = time;

    // updateProcedural(deltaTime);
    updateOOTTP(deltaTime);

    window.requestAnimationFrame(loop);
};
window.requestAnimationFrame(time => {
    previousTime = time;
    window.requestAnimationFrame(loop);
});
