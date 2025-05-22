"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriorityQueue = void 0;
/**
 * A generic priority queue implementation using a binary heap.
 * Supports custom comparison functions for flexible priority ordering.
 */
class PriorityQueue {
    /**
     * Creates a new PriorityQueue instance.
     * @param compareFunction - Optional custom comparison function.
     *                         Should return:
     *                         - negative number if a has higher priority than b
     *                         - positive number if b has higher priority than a
     *                         - 0 if equal priority
     *                         Default is min-heap behavior
     */
    constructor(compareFunction) {
        this.heap = [];
        this.compare = compareFunction || ((a, b) => {
            if (a < b)
                return -1;
            if (a > b)
                return 1;
            return 0;
        });
    }
    /**
     * Returns the number of elements in the queue.
     */
    size() {
        return this.heap.length;
    }
    /**
     * Checks if the queue is empty.
     */
    isEmpty() {
        return this.heap.length === 0;
    }
    /**
     * Returns the highest priority element without removing it.
     * @throws Error if queue is empty
     */
    peek() {
        if (this.isEmpty()) {
            throw new Error('Priority queue is empty');
        }
        return this.heap[0];
    }
    /**
     * Adds an element to the queue.
     * @param element - The element to add
     */
    enqueue(element) {
        this.heap.push(element);
        this.bubbleUp(this.heap.length - 1);
    }
    /**
     * Removes and returns the highest priority element.
     * @throws Error if queue is empty
     */
    dequeue() {
        if (this.isEmpty()) {
            throw new Error('Priority queue is empty');
        }
        const result = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }
        return result;
    }
    /**
     * Clears all elements from the queue.
     */
    clear() {
        this.heap = [];
    }
    bubbleUp(index) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) {
                break;
            }
            this.swap(index, parentIndex);
            index = parentIndex;
        }
    }
    bubbleDown(index) {
        while (true) {
            let smallest = index;
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;
            if (leftChild < this.heap.length &&
                this.compare(this.heap[leftChild], this.heap[smallest]) < 0) {
                smallest = leftChild;
            }
            if (rightChild < this.heap.length &&
                this.compare(this.heap[rightChild], this.heap[smallest]) < 0) {
                smallest = rightChild;
            }
            if (smallest === index) {
                break;
            }
            this.swap(index, smallest);
            index = smallest;
        }
    }
    swap(i, j) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
    filter(predicate) {
        this.heap = this.heap.filter(predicate);
        this.rebuildHeap(); // Rebuild the heap after filtering to maintain heap propertie
        return this;
    }
    rebuildHeap() {
        for (let i = Math.floor(this.heap.length / 2); i >= 0; i--) {
            this.bubbleDown(i);
        }
    }
    map(transform) {
        return this.heap.map(transform);
    }
    print() {
        console.log(this.heap);
    }
}
exports.PriorityQueue = PriorityQueue;
