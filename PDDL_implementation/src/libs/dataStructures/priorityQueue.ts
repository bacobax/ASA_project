/**
 * A generic priority queue implementation using a binary heap.
 * Supports custom comparison functions for flexible priority ordering.
 */
export class PriorityQueue<T> {
    private heap: T[] = [];
    private compare: (a: T, b: T) => number;

    /**
     * Creates a new PriorityQueue instance.
     * @param compareFunction - Optional custom comparison function. 
     *                         Should return:
     *                         - negative number if a has higher priority than b
     *                         - positive number if b has higher priority than a
     *                         - 0 if equal priority
     *                         Default is min-heap behavior
     */
    constructor(compareFunction?: (a: T, b: T) => number) {
        this.compare = compareFunction || ((a: T, b: T) => {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        });
    }

    /**
     * Returns the number of elements in the queue.
     */
    size(): number {
        return this.heap.length;
    }

    /**
     * Checks if the queue is empty.
     */
    isEmpty(): boolean {
        return this.heap.length === 0;
    }

    /**
     * Returns the highest priority element without removing it.
     * @throws Error if queue is empty
     */
    peek(): T {
        if (this.isEmpty()) {
            throw new Error('Priority queue is empty');
        }
        return this.heap[0];
    }

    /**
     * Adds an element to the queue.
     * @param element - The element to add
     */
    enqueue(element: T): void {
        this.heap.push(element);
        this.bubbleUp(this.heap.length - 1);
    }

    /**
     * Removes and returns the highest priority element.
     * @throws Error if queue is empty
     */
    dequeue(): T {
        if (this.isEmpty()) {
            throw new Error('Priority queue is empty');
        }

        const result = this.heap[0];
        const last = this.heap.pop()!;

        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }

        return result;
    }

    /**
     * Clears all elements from the queue.
     */
    clear(): void {
        this.heap = [];
    }

    private bubbleUp(index: number): void {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) {
                break;
            }
            this.swap(index, parentIndex);
            index = parentIndex;
        }
    }

    private bubbleDown(index: number): void {
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

    private swap(i: number, j: number): void {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }

    public filter(predicate: (value: T, index: number, array: T[]) => boolean): PriorityQueue<T> {
        this.heap = this.heap.filter(predicate);
        this.rebuildHeap(); // Rebuild the heap after filtering to maintain heap propertie
        return this;
    }
    private rebuildHeap(): void {
        for (let i = Math.floor(this.heap.length / 2); i >= 0; i--) {
            this.bubbleDown(i);
        }
    }
    public map<U>(transform: (value: T, index: number, array: T[]) => U): U[] {
        return this.heap.map(transform);
    }

    public print(): void {
        console.log(this.heap);
    }
}