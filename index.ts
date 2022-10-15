import * as _ from 'lodash'
import * as BG from './bgjs/src/index';
import * as PIXI from 'pixi.js'

// Fixes a problem with live reload in the parcel bundler. See this issue: https://github.com/parcel-bundler/parcel/issues/289
declare let module: any;
if (module.hot) {
    module.hot.dispose(() => {
        window.location.reload();
    })
}

type Vec2 = {
    x: number,
    y: number,
};


class BoxExtent extends BG.Extent {
    position: BG.State<Vec2>;
    velocity: BG.State<Vec2>;

    graphics: PIXI.Graphics;
    game: GameExtent;

    constructor(graph: BG.Graph, initialPosition: Vec2, initialVelocity: Vec2, game: GameExtent) {
        super(graph);
        this.position = this.state(initialPosition);
        this.velocity = this.state(initialVelocity);
        this.game = game;

        const boxSize = 100;
        const blueBoxGraphics = new PIXI.Graphics();
        blueBoxGraphics.beginFill(0x0000FF);
        blueBoxGraphics.drawRect(0, 0, boxSize, boxSize);
        blueBoxGraphics.endFill();
        this.graphics = blueBoxGraphics;


        // Box movement
        this.behavior()
            .supplies(this.position)
            .demands(this.game.timerTick, this.velocity, this.addedToGraph)
            .runs(() => {
                this.position.update({ x: this.position.value.x + this.velocity.value.x, y: this.position.value.y + this.velocity.value.y });
            });

        // Box rendering update (is it better to separate it like this, or leave it with the timertick demand?)
        this.behavior()
            .demands(this.position)
            .runs(() => {
                this.sideEffect(() => {
                    blueBoxGraphics.position.x = this.position.value.x;
                    blueBoxGraphics.position.y = this.position.value.y;
                });
            });
    }
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

class GameExtent extends BG.Extent {
    timerTick: BG.Moment<number>;
    mouseClick: BG.Moment<Vec2>;
    rootPixiContainer: PIXI.Container;
    boxes: BG.State<BoxExtent[]>;

    constructor(graph: BG.Graph, rootPixiContainer: PIXI.Container) {
        super(graph);

        this.timerTick = this.moment();
        this.mouseClick = this.moment();
        document.addEventListener("click", (e) => {
            this.mouseClick.updateWithAction({ x: e.clientX, y: e.clientY });
        });
        // TODO: remove listener
        this.rootPixiContainer = rootPixiContainer;
        this.boxes = this.state([]);

        this.behavior()
            .supplies(this.boxes)
            .demands(this.mouseClick)
            .runs(() => {
                if (this.mouseClick.justUpdated) {
                    const minVelocity = -3;
                    const maxVelocity = 3;

                    const box = new BoxExtent(
                        this.graph,
                        { x: this.mouseClick.value!.x, y: this.mouseClick.value!.y },
                        { x: Math.random() * (maxVelocity - minVelocity) + minVelocity, y: Math.random() * (maxVelocity - minVelocity) + minVelocity },
                        this,
                    );
                    this.addChildLifetime(box as unknown as BG.Extent);
                    box.addToGraph();
                    this.boxes.value.push(box);
                    this.boxes.updateForce(this.boxes.value);
                    this.sideEffect(() => {
                        this.rootPixiContainer.addChild(box.graphics);
                    });
                }
            });
    }
}



const g = new BG.Graph();
const e = new GameExtent(g, initialPixiSetup());

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



