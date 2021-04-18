import { IEntityKey } from './../geometry/entity';
import { SelectableElement } from './../geometry/selectable';
import { ISpaceTranslator } from "./geometrySelector";
import { Vector, subtract, add, snap } from "../math/vector";
import { World } from "../stateModel";
import { IActionHandler } from "./actions";
import { IVertex } from "../geometry/vertex";
import { isCloseToSelected, isEdge, isVertex } from "../geometry/selectable";
import { connect } from '../store/store-connector';
import { useAppDispatch } from '../store';
import { move } from '../store/walls';

const dispatch = useAppDispatch();

export class GeometryMover implements IActionHandler {
    private isDragging: boolean;
    private origin: Vector;
    private selectedElements: SelectableElement[] = [];
    
    constructor(private spaceTranslator: ISpaceTranslator, private world: World, private blockingHandlers: IActionHandler[] = []) {
        connect(s => {
            this.selectedElements = s.selection.elements;    
        });
    }
    
    register(g: GlobalEventHandlers): IActionHandler {
        g.addEventListener('mousedown', this.dragStart);
        g.addEventListener('mousemove', this.drag);
        g.addEventListener('mouseup', this.dragStop);
        return this;
    }

    handle(): void {}    
    isActive = (): boolean => this.isDragging;

    private dragStart = (event: MouseEvent): boolean => {
        if (this.blockingHandlers.some(_ => _.isActive())) { return false; }
        // left mouse click for moving
        if (event.button !== 0) { return false; }
        this.origin = this.spaceTranslator.toWorldSpace(event);        
        this.isDragging = !event.ctrlKey && this.selectedElements.some(s => isCloseToSelected(this.origin, s));    
        // moving started => prevent other mousedown listeners    
        if (this.isDragging) event.stopImmediatePropagation();
        return true;
    };
    private drag = (event: MouseEvent): boolean => this.isDragging ? this.move(event, true) : true;
    private dragStop = (event: MouseEvent): boolean => {
        if (this.isDragging) {
            this.isDragging = false;
            return this.move(event);
        }
        return false;
    };

    private move = (event: MouseEvent, disableUndo: boolean = undefined): boolean => {
        const destination = this.spaceTranslator.toWorldSpace(event);
        let direction = this.snap(event.ctrlKey, subtract(destination, this.origin));
                
        const verticesMap: Map<IEntityKey, IVertex[]> = this.selectedElements.reduce((acc, s) => {
            return acc.set(s.polygon.id, Array.from(new Set<IVertex>([...(acc.get(s.polygon.id)||[]).concat(
                isVertex(s)
                ? [s.vertex]
                : isEdge(s)
                ? [s.edge.start, s.edge.end]
                : s.polygon.vertices)])));
        }, new Map());
        
        dispatch(move({
            snap: event.ctrlKey, 
            direction, 
            verticesMap,
            disableUndo
        }));

        // calculate new origin for next drag operation
        this.origin = add(this.origin, direction);
        return true;
    };

    private snap = (isSnapping: boolean, vector: Vector) => isSnapping ? snap(vector) : vector;
}
