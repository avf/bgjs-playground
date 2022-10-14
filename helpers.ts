export function isEqualWithDelta(left: number, right: number, delta: number): boolean {
    return Math.abs(left - right) < delta;
}

declare global {
    interface Array<T> {
        /** Removes the element from the array. Object identity is used for comparison. Returns true if an element was removed, and false otherwise. */
        remove(element: T): boolean;
    }
}

Array.prototype.remove = function <T>(element: T): boolean {
    const index = this.indexOf(element);
    if (index === -1) {
        return false;
    }
    this.splice(index, 1);
    return true;
}

