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
const playAreaHeight = 400;
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
type EventData = EventDataUpdate | EventDataKeyUp | EventDataKeyDown;

type EventDataUpdate = {
    eventType: "update",
    data: {
        deltaTime: number,
    }
};

type EventDataKeyDown = {
    eventType: "keyDown",
    data: {
        timestamp: number,
        keyCode: string,
    }
};

type EventDataKeyUp = {
    eventType: "keyUp",
    data: {
        timestamp: number,
        keyCode: string,
    }
};

type OutputData = {
    playheadY: number,
    playedKeyRectangles: PIXI.Rectangle[],
};

const events: EventData[] = [];
let accumulatedCurrentTime = 0;
function updateOOTTP(deltaTime: number): void {
    accumulatedCurrentTime += deltaTime;
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

    const currentTime = events.filter(e => e.eventType === "update")
        .map(e => (e as EventDataUpdate).data.deltaTime)
        .reduce((a, b) => a + b);
    const playheadYForCurrentTime = calculatePlayheadY(currentTime);
    const playedKeyRectangles: PIXI.Rectangle[] = [];
    let lastY = 0;
    for (const event of events) {
        if (event.eventType === "keyDown") {
            if (event.data.keyCode === "Space") {
                lastY = calculatePlayheadY(event.data.timestamp);
                playedKeyRectangles.push(new PIXI.Rectangle(0, lastY, playAreaWidth, playheadYForCurrentTime - lastY));

                // TODO: There's still a bug when the key is held down longer than the playAreaHeight
                // In that case, 2 rectangles would have to be drawn (one from the event timestamp to playAreaHeight, and one from playAreaHeight to currentTime)
            }
        } else if (event.eventType === "keyUp") {
            if (event.data.keyCode === "Space") {
                const lastRectangle = playedKeyRectangles[playedKeyRectangles.length - 1];
                lastRectangle.height = calculatePlayheadY(event.data.timestamp) - lastY;
            }
        }
    }

    return {
        playheadY: playheadYForCurrentTime,
        playedKeyRectangles: playedKeyRectangles,
    }
}

function calculatePlayheadY(currentTime: number): number {
    return (currentTime * velocity) % playAreaHeight;
}

let playedKeyGraphics: PIXI.Graphics[] = [];
function renderOOTTP(outputData: OutputData): void {
    // "Render"
    playhead.y = outputData.playheadY;


    for (const playedKeyGraphicsObject of playedKeyGraphics) {
        playedKeyGraphicsObject.destroy();
    }
    playedKeyGraphics = [];

    for (const rectangle of outputData.playedKeyRectangles) {
        const graphics = new PIXI.Graphics();
        playedKeyGraphics.push(graphics);
        graphics.lineStyle(1, 0x000000, 1);
        graphics.beginFill(0xFF0000);
        graphics.drawRect(0, 0, rectangle.width, rectangle.height);
        graphics.endFill();
        graphics.x = rectangle.x;
        graphics.y = rectangle.y;
        graphics.visible = true;
        graphics.alpha = 0.7;
        playArea.addChild(graphics);
    }

}

const allowedKeyCodes = ["Space"];
window.addEventListener('keydown', (e) => {
    if (allowedKeyCodes.includes(e.code)) {
        if (e.repeat) {
            return;
        }
        events.push({
            eventType: "keyDown",
            data: {
                timestamp: accumulatedCurrentTime,
                keyCode: e.code,
            }
        });
    }
});

window.addEventListener('keyup', (e) => {
    if (allowedKeyCodes.includes(e.code)) {
        events.push({
            eventType: "keyUp",
            data: {
                timestamp: accumulatedCurrentTime,
                keyCode: e.code,
            }
        });
    }
});
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
