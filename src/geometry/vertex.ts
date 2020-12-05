import { ILineSegment } from './lineSegment';
import { Guid } from "guid-typescript";

import * as vector from './vector';

export type Color = [number, number, number, number];
export type IMaterial = {color: Color};
export type IEntity = {id?: Guid};
export type IVertex = IEntity & { vector: vector.Vector };
export type IEdge = IEntity & { start: IVertex, end: IVertex, material?: IMaterial};
export type IStoredPolygon = IEntity & { edges: IEdge[]};
export type IPolygon = IStoredPolygon & { vertices: IVertex[]};
export type IStoredGeometry = IEntity & { polygons: IStoredPolygon[]};
export type IGeometry = { polygons: IPolygon[]};

export const makeVertex = (v: vector.Vector): IVertex => ({vector: v});
export const makeEdge = (v: vector.Vector, u: vector.Vector): IEdge => ({start: makeVertex(v), end: makeVertex(u)});
export const segmentFrom = (e: IEdge): ILineSegment => [e.start.vector, e.end.vector];
const isVertex = (v: IVertex|vector.Vector): v is IVertex => (v as IVertex).vector !== undefined;    
const giveIdentity = <T extends IEntity>(e : T): T => e.id ? e : ({...e, id: Guid.create()});
const getVector = (vertexOrVector: IVertex|vector.Vector): vector.Vector => isVertex(vertexOrVector) ? vertexOrVector.vector : vertexOrVector;
export const distance = (vertex: IVertex|vector.Vector, v: IVertex|vector.Vector): number => vector.distance(getVector(vertex), getVector(v));
const areEqual = (u: IVertex, v: IVertex) => u && v && u.vector.length === v.vector.length && u.vector.every((x, i) => x === v.vector[i]);
export const areClose = (vertex: IVertex|vector.Vector, v: IVertex|vector.Vector, epsilon: number = 0.005): boolean => { // TODO: magic constant
    let d = distance(vertex, v);
    return d <= epsilon; 
}

export const loadPolygon = (polygon: IStoredPolygon): IPolygon => {
    const result = {
        ...polygon,
        edges: polygon.edges.reduce((acc, e) => {
            e.start = giveIdentity(e.start);
            if (acc.first && areClose(e.end, acc.first.start)) {                
                e.end = giveIdentity(acc.first.start);
            }
            if (acc.previous && !areEqual(e.start, acc.previous.end)) {
                throw new Error(`polygon cannot contain jumps: start of edge should be equal to previous edge's end: ${acc.previous.end.vector} does not equal ${e.start.vector}`);                
            }
            else {
                e.start = giveIdentity(acc.previous && acc.previous.end || e.start);
                e.end = giveIdentity(e.end);
            }
            
            let edge = giveIdentity(e);            
            return ({ 
                first: acc.first || edge, 
                previous: edge, 
                edges: [...acc.edges, edge]
            });
        }, {edges:[]} as {first?: IEdge, previous?: IEdge, edges: IEdge[] }).edges,
        vertices: []};   

    return giveIdentity({...result, vertices: result.edges.map(_=>_.start)});
}

export const createPolygon = (vectors: vector.Vector[]): IPolygon => {
        
    // transform all vectors into vertices
    const vertices = vectors.map(makeVertex).map(giveIdentity);
    const startingVertex = vertices[0];
    
    // we are closing the polygon at the end, so remove the last vertex if it's close to the starting vertex
    if (areClose(startingVertex, vertices[vertices.length-1])) vertices.pop();       
    
    // put start at the end and reduce over the vertices to create a collection of edges
    const edges = vertices.slice(1).concat([startingVertex])
        .reduce((acc, v) => ({ 
                                edges: [...acc.edges, ({
                                    start: acc.previous, 
                                    end: v,
                                    material: {color: [20, 20, 255, Math.random()>0.5 ? 1 : 0.6] as Color}
                                })],
                                previous: v,
                            }), 
            {previous: startingVertex, edges: [] as IEdge[]})
        .edges;
    
    return loadPolygon({edges});
};
