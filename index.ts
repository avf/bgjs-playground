import * as _ from 'lodash'
import * as BG from 'behavior-graph'
import * as PIXI from 'pixi.js'
import { Moment } from './bgjs/src';

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

const boxSize = 100;

function createPIXIBox(): PIXI.Graphics {
    const blueBoxGraphics = new PIXI.Graphics();
    blueBoxGraphics.beginFill(0x0000FF);
    blueBoxGraphics.drawRect(0, 0, boxSize, boxSize);
    blueBoxGraphics.endFill();
    return blueBoxGraphics;
}

class BoxExtent extends BG.Extent {
    position: BG.State<Vec2>;
    velocity: BG.State<Vec2>;

    graphics: PIXI.Graphics;
    collisionMomentWithStartingPos: BG.Moment<Vec2>;

    constructor(graph: BG.Graph, initialPosition: Vec2, initialVelocity: Vec2, timerTick: BG.Moment<number>) {
        super(graph);
        this.position = this.state(initialPosition);
        this.velocity = this.state(initialVelocity);
        this.collisionMomentWithStartingPos = this.moment();

        this.graphics = createPIXIBox();

        // Collision handling
        this.behavior()
            .supplies(this.velocity)
            .demands(this.collisionMomentWithStartingPos)
            .runs(() => {
                if (this.collisionMomentWithStartingPos.justUpdated) {
                    this.velocity.update({
                        x: -this.velocity.value.x,
                        y: -this.velocity.value.y
                    });
                }
            });

        // Box movement
        this.behavior()
            .supplies(this.position)
            .demands(timerTick, this.velocity, this.collisionMomentWithStartingPos)
            .runs(() => {
                if (this.collisionMomentWithStartingPos.justUpdated && this.collisionMomentWithStartingPos.value) {
                    this.position.update({
                        x: this.collisionMomentWithStartingPos.value.x,
                        y: this.collisionMomentWithStartingPos.value.y
                    });
                } else if (timerTick.justUpdated) {
                    this.position.update({
                        x: this.position.value.x + this.velocity.value.x,
                        y: this.position.value.y + this.velocity.value.y
                    });
                }
            });

        // Box rendering update (is it better to separate it like this, or leave it with the timertick demand?)
        this.behavior()
            .demands(this.position, this.addedToGraph)
            .runs(() => {
                this.sideEffect(() => {
                    this.graphics.position.x = this.position.value.x;
                    this.graphics.position.y = this.position.value.y;
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
    worldSize: BG.State<Vec2>;

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
        this.worldSize = this.state({ x: 800, y: 800 });

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
                        this.timerTick,
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


        // Collision detection
        this.behavior()
            .demands(this.timerTick, this.worldSize)
            .dynamicSupplies([this.boxes], () => {
                return this.boxes.value.map(box => box.collisionMomentWithStartingPos);
            })
            .runs(() => {
                if (this.timerTick.justUpdated || this.worldSize.justUpdated) {
                    const worldSize = this.worldSize.value;
                    for (const box of this.boxes.traceValue) {
                        const positionX = box.position.traceValue.x;
                        const positionY = box.position.traceValue.y;
                        if (positionX < 0 || positionX > worldSize.x
                            || positionY < 0 || positionY > worldSize.y) {
                            const newX = Math.min(Math.max(positionX, 0), worldSize.x);
                            const newY = Math.min(Math.max(positionY, 0), worldSize.y);
                            box.collisionMomentWithStartingPos.update({ x: newX, y: newY });
                        } else {
                            for (const otherBox of this.boxes.traceValue) {
                                if (box === otherBox) {
                                    continue;
                                }
                                if (checkCollision(box.position.traceValue, otherBox.position.traceValue)) {
                                    // TODO: Calculate point of collision here and add it as the starting point to the update action
                                    box.collisionMomentWithStartingPos.update();
                                    otherBox.collisionMomentWithStartingPos.update();
                                }
                            }
                        }
                    }
                }
            });
    }
}

function checkCollision(entity1Position: Vec2, entity2Position: Vec2): boolean {
    // TODO: This is just simple rectangle intersection, should be taking velocity into account
    const rectA = new PIXI.Rectangle(entity1Position.x, entity1Position.y, boxSize, boxSize);
    const other = new PIXI.Rectangle(entity2Position.x, entity2Position.y, boxSize, boxSize);

    const x0 = rectA.x < other.x ? other.x : rectA.x;
    const x1 = rectA.right > other.right ? other.right : rectA.right;
    if (x1 <= x0) {
        return false;
    }
    const y0 = rectA.y < other.y ? other.y : rectA.y;
    const y1 = rectA.bottom > other.bottom ? other.bottom : rectA.bottom;
    return y1 > y0;
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





type LockState = "Unlocked" | "Locked";

class CoinMachine extends BG.Extent {
    lockState: BG.State<LockState>;
    coinMoment: BG.Moment<void>;
    pushMoment: BG.Moment<void>;

    constructor(graph: BG.Graph) {
        super(graph);
        this.lockState = this.state("Locked");
        this.coinMoment = this.moment();
        this.pushMoment = this.moment();


        this.behavior()
            .demands(this.coinMoment, this.pushMoment)
            .supplies(this.lockState)
            .runs(() => {
                if (this.coinMoment.justUpdated) {
                    this.lockState.update("Unlocked");
                } else if (this.pushMoment.justUpdated) {
                    this.lockState.update("Locked");
                }
                this.sideEffect(() => {
                    console.log(this.lockState.value);
                })
            });

    }
}

const coinMachine = new CoinMachine(g);
coinMachine.addToGraphWithAction();
coinMachine.action(() => {
    coinMachine.coinMoment.update();
});


type DogWalkState =
    Waiting
    | OnAWalk
    | WalkComplete;

type DogWalkEvent =
    "leave home"
    | "arrive home";


type OnAWalkState =
    "Walking"
    | "Running"
    | "StoppingToSniff";

class DogWalk extends BG.Extent {
    dogWalkState: BG.State<DogWalkState> = this.state({ type: "Waiting" });
    eventMoment: BG.Moment<DogWalkEvent> = this.moment();

    constructor(graph: BG.Graph) {
        super(graph);

        this.behavior()
            .demands(this.eventMoment)
            .supplies(this.dogWalkState)
            .runs(() => {
                if (this.eventMoment.justUpdatedTo("leave home")) {
                    if (this.dogWalkState.value.type === "Waiting") {
                        const onAWalkExtent = new OnAWalkExtent(this.graph);
                        this.addChildLifetime(onAWalkExtent as unknown as BG.Extent);
                        onAWalkExtent.addToGraph();

                        this.dogWalkState.update({
                            type: "OnAWalk",
                            state: onAWalkExtent,
                        });
                    }
                } else if (this.eventMoment.justUpdatedTo("arrive home")) {
                    if (this.dogWalkState.value.type === "OnAWalk") {
                        this.dogWalkState.value.state.removeFromGraph();
                        this.dogWalkState.update({ type: "WalkComplete" });
                    }
                }
                this.sideEffect(() => {
                    console.log("state changed to: ", this.dogWalkState.value);
                });
            });

    }
}

type Waiting = {
    type: "Waiting",
};

type OnAWalk = {
    type: "OnAWalk",
    state: OnAWalkExtent,
};

type WalkComplete = {
    type: "WalkComplete",
};

type OnAWalkEvent =
    "speed up"
    | "slow down"
    | "stop"
    | "sudden speed up"
    | "sudden stop";


class OnAWalkExtent extends BG.Extent {
    onAWalkState: BG.State<OnAWalkState> = this.state("Walking");
    eventMoment: BG.Moment<OnAWalkEvent> = this.moment();

    constructor(graph: BG.Graph) {
        super(graph);

        this.behavior()
            .demands(this.eventMoment)
            .supplies(this.onAWalkState)
            .runs(() => {
                if (this.eventMoment.justUpdatedTo("speed up")) {
                    if (this.onAWalkState.value === "Walking") {
                        this.onAWalkState.update("Running");
                    } else if (this.onAWalkState.value === "StoppingToSniff") {
                        this.onAWalkState.update("Walking");
                    }
                } else if (this.eventMoment.justUpdatedTo("slow down")) {
                    if (this.onAWalkState.value === "Running") {
                        this.onAWalkState.update("Walking");
                    }
                } else if (this.eventMoment.justUpdatedTo("stop")) {
                    if (this.onAWalkState.value === "Walking") {
                        this.onAWalkState.update("StoppingToSniff");
                    }
                } else if (this.eventMoment.justUpdatedTo("sudden speed up")) {
                    if (this.onAWalkState.value === "StoppingToSniff") {
                        this.onAWalkState.update("Running");
                    }
                } else if (this.eventMoment.justUpdatedTo("sudden stop")) {
                    if (this.onAWalkState.value === "Running") {
                        this.onAWalkState.update("StoppingToSniff");
                    }
                }
                this.sideEffect(() => {
                    console.log("state changed to: ", this.onAWalkState.value);
                });
            });
    }
}


const dogWalk = new DogWalk(g);
dogWalk.addToGraphWithAction();
dogWalk.eventMoment.updateWithAction("leave home");
// The following does not work, how to send events to the compound state?
// if (dogWalk.dogWalkState.value.type === "OnAWalk") {
//     dogWalk.dogWalkState.value.state.onAWalkState.updateWithAction("Running");
// }