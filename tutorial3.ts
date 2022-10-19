import * as bg from 'behavior-graph';

class ListExtent extends bg.Extent {
    save: bg.Moment<string>;
    allItems: bg.State<ItemExtent[]>;
    removeItem: bg.Moment<ItemExtent>;
    selectRequest: bg.Moment<ItemExtent>;
    selected: bg.State<ItemExtent | null>;

    constructor(graph: bg.Graph) {
        super(graph);

        this.save = this.moment();
        document.querySelector('#save')!.addEventListener('click', () => {
            const newItemElem = document.querySelector('#new-item-text') as HTMLInputElement;
            this.save.updateWithAction(newItemElem.value);
        });

        this.allItems = this.state([]);
        this.removeItem = this.moment();
        this.selectRequest = this.moment();
        this.selected = this.state(null);

        this.behavior()
            .supplies(this.allItems)
            .demands(this.save, this.removeItem)
            .runs(() => {
                if (this.save.justUpdated && this.selected.traceValue === null) {
                    const item = new ItemExtent(this.graph, this.save.value!, this);
                    this.addChildLifetime(item as unknown as bg.Extent);
                    item.addToGraph();
                    this.allItems.value.push(item);
                    this.allItems.updateForce(this.allItems.value);
                    this.sideEffect(() => {
                        const listHTMLElement = document.querySelector('#list') as HTMLUListElement;
                        listHTMLElement.appendChild(item.itemElement);
                        const newItemElem = document.querySelector('#new-item-text') as HTMLInputElement;
                        newItemElem.value = '';
                    });
                } else if (this.removeItem.justUpdated) {
                    const item = this.removeItem.value!;
                    item.removeFromGraph();
                    this.allItems.update(this.allItems.value.filter(listItem => listItem !== item));
                    this.sideEffect(() => {
                        const listHTMLElement = document.querySelector('#list') as HTMLUListElement;
                        listHTMLElement.removeChild(item.itemElement);
                    });
                }
            });

        this.behavior()
            .dynamicSupplies([this.allItems], () => {
                return this.allItems.value.map(item => item.itemText);
            })
            .demands(this.save)
            .runs(() => {
                if (this.save.justUpdated && this.selected.traceValue !== null) {
                    this.selected.traceValue.itemText.update(this.save.value!);
                }
            });

        this.behavior()
            .demands(this.allItems, this.addedToGraph)
            .dynamicDemands([this.allItems], () => {
                return this.allItems.value.map(item => item.completed);
            })
            .runs(() => {
                this.sideEffect(() => {
                    const count = this.allItems.value.filter(item => !item.completed.value).length;
                    document.querySelector('#remaining-count')!.textContent = count.toString();
                });
            });

        this.behavior()
            .supplies(this.selected)
            .demands(this.selectRequest, this.save, this.removeItem)
            .runs(() => {
                if (this.selectRequest.justUpdated) {
                    if (this.selected.value == this.selectRequest.value) {
                        this.selected.update(null);
                    } else {
                        this.selected.update(this.selectRequest.value!);
                    }
                } else if (this.save.justUpdated || (this.removeItem.justUpdated && this.removeItem.value === this.selected.value)) {
                    this.selected.update(null);
                }

                if (this.selected.justUpdated) {
                    this.sideEffect(() => {
                        const newItemElem = document.querySelector('#new-item-text') as HTMLInputElement;
                        newItemElem.value = this.selected.value === null ? '' : this.selected.value.itemText.value;
                        const actionText = document.querySelector('#action') as HTMLSpanElement;
                        actionText.innerText = this.selected.value === null ? 'Add' : 'Edit'
                    });
                }
            });

    }
}

class ItemExtent extends bg.Extent {

    list: ListExtent;
    itemText: bg.State<string>;
    itemElement: HTMLLIElement;
    completed: bg.State<boolean>;


    constructor(graph: bg.Graph, text: string, list: ListExtent) {
        super(graph);
        this.list = list;
        this.itemText = this.state(text);
        this.itemElement = document.querySelector('#templates .list-item')!.cloneNode(true) as HTMLLIElement;
        this.completed = this.state(false);
        this.itemElement.querySelector('.completed-checkbox')!.addEventListener('change', () => {
            this.completed.updateWithAction(!this.completed.value);
        });
        this.itemElement.querySelector('.item-delete')!.addEventListener('click', () => {
            this.list.removeItem.updateWithAction(this);
        });
        this.itemElement.querySelector('.item-text')!.addEventListener('click', () => {
            this.list.selectRequest.updateWithAction(this);
        });

        this.behavior()
            .demands(this.itemText, this.addedToGraph)
            .runs(() => {
                this.sideEffect(() => {
                    (this.itemElement.querySelector('.item-text') as HTMLDivElement).innerText = this.itemText.value;
                });
            });

        this.behavior()
            .demands(this.completed, this.addedToGraph)
            .runs(() => {
                this.sideEffect(() => {
                    const completedClass = 'completed';
                    if (this.completed.value) {
                        this.itemElement.classList.add(completedClass);
                    } else {
                        this.itemElement.classList.remove(completedClass);
                    }
                });
            });

        this.behavior()
            .demands(this.list.selected)
            .runs(() => {
                const selected = this.list.selected.value === this;
                this.sideEffect(() => {
                    const selectedClass = 'selected'
                    if (selected) {
                        this.itemElement.classList.add(selectedClass);
                    } else {
                        this.itemElement.classList.remove(selectedClass);
                    }
                });
            });
    }
}

const graph = new bg.Graph();
const list = new ListExtent(graph);
list.addToGraphWithAction();