import { isPolygon, SelectableElement } from './../geometry/selectable';
import { IPolygon } from "../geometry/polygon";
import { World } from "../stateModel";
import { IActionHandler } from "./actions";
import { ISpaceTranslator } from "./geometrySelector";
import { ipcRenderer } from 'electron';
import { drawSegment, drawVector } from '../drawing/drawing';
import { EMPTY_GEOMETRY, IGeometry, rotatePolygon } from '../geometry/geometry';
import undoService from './undoService';
import { connect } from '../store/store-connector';

export class PolygonRotator implements IActionHandler {
    
    private isRotating: boolean;
    private candidates: IPolygon[] = [];
    private selectedElements: SelectableElement[] = [];
    private wallGeometry = EMPTY_GEOMETRY;

    constructor(
        private context: CanvasRenderingContext2D,
        private spaceTranslator: ISpaceTranslator,
        private world: World) {
            connect(s => {
                this.selectedElements = s.selection.elements;
                this.wallGeometry = s.walls.geometry;
            });
        }
   
    private get selectedPolygons(): IPolygon[] {
        return this.selectedElements.filter(isPolygon).map(_ => _.polygon);
    }

    register(g: GlobalEventHandlers): IActionHandler {
        ipcRenderer.on('geometry_polygon_rotate', this.startRotation);
        g.addEventListener('mousemove', this.selectRotation);
        g.addEventListener('mouseup', this.finalizeRotation);
        g.addEventListener('contextmenu', this.cancel, false); 
        return this;
    }

    handle(): void {
        if (this.isActive() && this.candidates.length > 0) {
            this.candidates.forEach(p => {
                p.edges.forEach(e => drawSegment(this.context, e.segment, 'rgba(255, 150, 10, 0.7)'));
                p.vertices.forEach((v, i) => drawVector(this.context, v.vector, i === 0 ? 'rgba(50, 255, 10, 0.7)' : 'rgba(255, 150, 10, 0.7)'));
            });            
        }
    }     
    public isActive = () => this.isRotating;
    private startRotation = () => this.isRotating = this.canActivate();
    private canActivate = () => this.selectedPolygons.length >= 1;
    private cancel = () => {
        this.isRotating = false;
        this.candidates = [];
    }

    private selectRotation = (event: MouseEvent): boolean => {
        if (!this.isActive()) { return false; }        
        const selectedPolygonIds = this.selectedPolygons.map(_ => _.id);
        const newGeometry = this.calculateRotation(event);
        this.candidates = newGeometry.polygons.filter(p => selectedPolygonIds.includes(p.id));
        return true;
    };    

    private finalizeRotation = (event: MouseEvent): boolean => {
        if (event.button !== 0) { return false; }
        if (!this.isActive()) { return false; }
        event.stopImmediatePropagation();
        this.wallGeometry = this.calculateRotation(event);
        undoService.push(this.wallGeometry);        
        this.cancel();
        return true;
    };

    private calculateRotation = (event: MouseEvent): IGeometry => {
        const target = this.spaceTranslator.toWorldSpace(event);
        return rotatePolygon(this.selectedPolygons.map(x => x.id), target, this.wallGeometry);
    }    
}