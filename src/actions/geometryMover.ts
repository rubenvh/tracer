import { ISpaceTranslator } from "./geometrySelector";
import { Vector, subtract, add, copyIn } from "../vector";
import { SelectableElement } from "../world";
import { IActionHandler } from "./actions";

export class GeometryMover implements IActionHandler {
    private isDragging: boolean;
    private origin: Vector;

    constructor(private spaceTranslator: ISpaceTranslator, private selectedGeometry: SelectableElement[]) {
    }
    

    register(g: GlobalEventHandlers): IActionHandler {
        g.addEventListener('mousedown', this.dragStart);
        g.addEventListener('mousemove', this.drag);
        g.addEventListener('mouseup', this.dragStop);
        return this;
    }

    handle(): void {}    

    private dragStart = (event: MouseEvent): boolean => {
        if (event.button !== 0)
            return false; // left mouse click
        this.isDragging = true;
        this.origin = this.spaceTranslator.toWorldSpace(event);
        return true;
    };
    private drag = (event: MouseEvent): boolean => this.isDragging ? this.move(event) : true;
    private dragStop = (event: MouseEvent): boolean => {
        if (this.isDragging) {
            this.isDragging = false;
            this.move(event);
            return true;
        }
        return false;
    };

    private move = (event: MouseEvent): boolean => {
        const destination = this.spaceTranslator.toWorldSpace(event);
        let delta = this.snap(event.ctrlKey, subtract(destination, this.origin));

        // TODO: refactor this using typescript type checks
        this.selectedGeometry.forEach((e: any) => {
            if (e.vector) {
                copyIn(e.vector, this.snap(event.ctrlKey, add(e.vector, delta)));
            }
            else if (e.start && e.end) {
                if (!this.selectedGeometry.includes(e.start))
                    copyIn(e.start.vector, this.snap(event.ctrlKey, add(e.start.vector, delta)));
                if (!this.selectedGeometry.includes(e.end))
                    copyIn(e.end.vector, this.snap(event.ctrlKey, add(e.end.vector, delta)));
            }
        });

        // calculate new origin for next drag operation
        this.origin = add(this.origin, delta);
        return true;
    };

    private snap = (isSnapping: boolean, vector: Vector) => isSnapping ? [this.roundToGrid(vector[0]), this.roundToGrid(vector[1])] : vector;
    private roundToGrid = (value: number) => Math.round(value / 20) * 20;
}