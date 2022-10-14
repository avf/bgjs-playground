import * as _ from 'lodash'
import * as BG from 'behavior-graph'
import * as PIXI from 'pixi.js'

// Fixes a problem with live reload in the parcel bundler. See this issue: https://github.com/parcel-bundler/parcel/issues/289
declare let module: any;
if (module.hot) {
    module.hot.dispose(() => {
        window.location.reload();
    })
}

type Position = {
    x: number,
    y: number,
};

const pixiContainer = document.querySelector("#pixi-container") as HTMLElement;
const pixiApplication = new PIXI.Application({ resolution: window.devicePixelRatio, autoDensity: true, resizeTo: pixiContainer, antialias: true, backgroundColor: 0xFFFFFF });
pixiApplication.renderer.plugins.interaction.autoPreventDefault = false;
pixiApplication.renderer.view.style.touchAction = "auto";
pixiContainer.appendChild(pixiApplication.view);
const rootPixiContainer = new PIXI.Container();
pixiApplication.stage.addChild(rootPixiContainer);


const boxSize = 100;
const blueBoxGraphics = new PIXI.Graphics();
blueBoxGraphics.beginFill(0x0000FF);
blueBoxGraphics.drawRect(0, 0, boxSize, boxSize);
blueBoxGraphics.endFill();
rootPixiContainer.addChild(blueBoxGraphics);

class GameExtent extends BG.Extent {
    timerTick: BG.Moment<number>;
    boxLocation: BG.State<Position>;

    constructor(graph: BG.Graph) {
        super(graph);

        this.timerTick = this.moment();
        this.boxLocation = this.state({ x: 0, y: 0 });

        // Logging behavior
        // this.behavior()
        //     .demands(this.timerTick)
        //     .runs(() => {
        //         this.sideEffect(() => {
        //             console.log(this.boxLocation.value);
        //         });
        //     });

        // Box movement
        this.behavior()
            .supplies(this.boxLocation)
            .demands(this.timerTick)
            .runs(() => {
                this.boxLocation.update({ x: this.boxLocation.value.x + 1, y: this.boxLocation.value.y });
                this.sideEffect(() => {
                    blueBoxGraphics.position.x = this.boxLocation.value.x;
                    blueBoxGraphics.position.y = this.boxLocation.value.y;
                });
            });

        // Box rendering update (is it better to separate it like this, or leave it with the timertick demand?)
        // this.behavior()
        //     .demands(this.boxLocation)
        //     .runs(() => {
        //         this.sideEffect(() => {
        //             blueBoxGraphics.position.x = this.boxLocation.value.x;
        //             blueBoxGraphics.position.y = this.boxLocation.value.y;
        //         });
        //     });

    }
}

const g = new BG.Graph();
const e = new GameExtent(g);

e.addToGraphWithAction();

let previousTime = 0;

const loop = (time: number): void => {
    const deltaTime = time - previousTime;
    previousTime = time;

    e.timerTick.updateWithAction(deltaTime);
    window.requestAnimationFrame(loop);
};
window.requestAnimationFrame(time => {
    previousTime = time;
    window.requestAnimationFrame(loop);
});