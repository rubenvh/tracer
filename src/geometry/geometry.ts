
import { Guid } from 'guid-typescript';
import * as vector from '../math/vector';
import * as collision from './collision';
import { IEdge } from './edge';
import { IEntity } from './entity';
import { BoundingBox, createPolygon, IPolygon, IStoredPolygon, loadPolygon, contains } from './polygon';
import { SelectableElement } from './selectable';
import { IVertex, makeVertex } from './vertex';


export type IStoredGeometry = IEntity & { polygons: IStoredPolygon[]};
export type IGeometry = { polygons: IPolygon[]};


export const loadGeometry = (geometry : IStoredGeometry): IGeometry => ({polygons: geometry.polygons.map(loadPolygon)});
export const createGeometry = (polygonCollection: vector.Vector[][]): IGeometry => ({polygons: polygonCollection.map(createPolygon)});
export const addPolygon = (p: IPolygon, geometry: IGeometry): IGeometry => ({polygons: [...geometry.polygons, p]});

export const detectCollisionAt = (vector: vector.Vector, geometry: IGeometry): collision.Collision => {
    return collision.detectCollisionAt(vector, geometry.polygons);    
}

export const detectCollisions = (ray: collision.IRay, geometry: IGeometry): collision.RayCollisions => {
    return collision.detectCollisions(ray, geometry.polygons);
}

const adaptPolygons = (ids: Guid[], geometry: IGeometry, edgeTransformer: (poligon: IPolygon)=>IEdge[]) => {
    
    let [unchanged, adapted] = geometry.polygons.reduce((acc, p) => {
        acc[+ids.includes(p.id)].push(p);
        return acc;
    }, [[],[]]);

    let adaptedPolygons = adapted.map(p => ({p, edges: edgeTransformer(p)}))
        .filter(_ => _.edges.length >= 2)
        .map(_ => loadPolygon({id: _.p.id, edges: _.edges}));

    return ({...geometry, polygons: [...unchanged, ...adaptedPolygons]});
};


export const splitEdge = (cut: vector.Vector, edge: IEdge, poligon: IPolygon, geometry: IGeometry) => {
    return adaptPolygons([poligon.id], geometry, (selectedPolygon) => {
        return selectedPolygon.edges.reduce((acc, e) => {
            if (e.id === edge.id) {
                const newEnd = e.end;
                e.end = makeVertex(cut);
                const newEdge: IEdge = {start: e.end, end: newEnd, immaterial: e.immaterial, material: {color: [...e.material.color]}};
                return acc.concat(e, newEdge);
            }
            return acc.concat(e);
        }, [])
    });
}

export const moveVertices = (isSnapping: boolean, delta: vector.Vector, map: Map<Guid, IVertex[]>, geometry: IGeometry): IGeometry => {
    const doSnap = (v: vector.Vector) => isSnapping ? vector.snap(v) : v;
    return adaptPolygons(Array.from(map.keys()), geometry, p => {
        const vertices = [...map.get(p.id)];
        const moveVertex = (v: IVertex) => {
            const index = vertices.indexOf(v);
            if (index >= 0) { 
                vertices.splice(index, 1);
                vector.copyIn(v.vector, doSnap(vector.add(v.vector, delta)));
            }
        };
        return p.edges.reduce((acc, e) => {
            moveVertex(e.start);
            moveVertex(e.end);            
            return acc.concat(e);
        }, [])
    });
}

export const removeVertex = (vertex: IVertex, poligon: IPolygon, geometry: IGeometry) => {
    return adaptPolygons([poligon.id], geometry, (selectedPolygon) => {
        const {edges} = selectedPolygon.edges.reduce((acc, e)=> {                
            if (e.end === vertex && acc.lastEnd) { // first vertex in polygon was removed and we arrive at the last edge
                e.end = acc.lastEnd;
                acc.edges.push(e);
            }
            else if (e.end === vertex) {  // edge end vertex is removed => store for next iteration to reassign end vertex 
                acc.previous = e;
                acc.edges.push(e);            
            } else if (acc.previous && e.start === vertex) { // ignore this edge and reassign previous end 
                acc.previous.end = e.end;            
            } else if (e.start === vertex) { // removing the start of the first edge, keep end until last edge
                acc.lastEnd = e.end;
            } else {
                acc.edges.push(e);
            }        
            return acc;  
            }, 
            {edges: [], previous: null as IEdge, lastEnd: null as IVertex})
        return edges;
    });
}

export const selectRegion = (region: BoundingBox, geometry: IGeometry): SelectableElement[] => {
    return geometry.polygons.filter(p => contains(region, p.boundingBox)).map(p => ({kind: 'polygon', polygon: p}));
}

// export const saveGeometry = (geometry: Geometry): IGeometry => {
//     return geometry;
// }