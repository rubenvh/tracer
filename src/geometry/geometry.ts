
import { intersectRay, IRay, distanceToMidPoint } from './lineSegment';
import * as vector from './vector';
import { IGeometry, IVertex, distance, IPolygon, loadPolygon, createPolygon, IStoredGeometry, IEdge, makeVertex, segmentFrom } from './vertex';

export type Collision = {polygon: IPolygon, distance: number, kind: string};
export type VertexCollision = Collision & { vertex: IVertex, kind: "vertex"};
export type EdgeCollision = Collision & {edge: IEdge, kind: "edge" };
export type RayHit = {polygon: IPolygon, edge: IEdge, intersection: vector.Vector, ray: IRay, distance: number};

export const loadGeometry = (geometry : IStoredGeometry): IGeometry => ({polygons: geometry.polygons.map(loadPolygon)});
export const createGeometry = (polygonCollection: vector.Vector[][]): IGeometry => ({polygons: polygonCollection.map(createPolygon)});
export const addPolygon = (p: IPolygon, geometry: IGeometry): IGeometry => ({polygons: [...geometry.polygons, p]});

export const detectCollisionAt = (vector: vector.Vector, geometry: IGeometry): VertexCollision|EdgeCollision => {
    const distanceComparer = (x: {distance:number}, y: {distance:number}) => x.distance - y.distance;
        return geometry.polygons.reduce((acc, p) => {            
            let edges: Collision[] = p.edges
                .map(e => ({polygon: p, kind: "edge", edge: e, distance: distanceToMidPoint(vector, segmentFrom(e))} as const));
            let vertices: Collision[] = p.vertices
            .map(v => ({ polygon: p, kind: "vertex", vertex: v, distance: distance(v, vector)} as const));

            let closest = edges.concat(vertices)                
            .filter(_ => _.distance <= 50)
            .sort(distanceComparer)[0];
            return closest ? acc.concat(closest) : acc;
        }, [])
        .sort(distanceComparer)[0];
} 

export const splitEdge = (cut: vector.Vector, edge: IEdge, poligon: IPolygon, geometry: IGeometry) => {
    let selectedPolygon: IPolygon;
    let others = geometry.polygons.reduce((acc, p) => {
        if (p.id === poligon.id) selectedPolygon = p;
        return (p.id !== poligon.id) ? acc.concat(p) : acc
    }, []);

    let newEdges = selectedPolygon.edges.reduce((acc, e) => {
        if (e.id === edge.id) {
            const newEnd = e.end;
            e.end = makeVertex(cut);
            const newEdge: IEdge = {start: e.end, end: newEnd, material: e.material};
            return acc.concat(e, newEdge);
        }
        return acc.concat(e);
    }, [])

    return ({...geometry, 
        polygons: [...others, loadPolygon({id: selectedPolygon.id, edges: newEdges})]
    });
}

export const detectCollisions = (ray: IRay, geometry: IGeometry): RayHit[] => {
    const result: RayHit[] = [];
    for (const polygon of geometry.polygons){
        for (const edge of polygon.edges) {
            const intersection = intersectRay(ray, segmentFrom(edge));
            if (intersection) {
                result.push({polygon, ray, edge, intersection,
                    distance: vector.distance(intersection, ray.line[0]) * Math.cos(ray.angle)
                })
            }
        }
    }
    return result;
}

// export const saveGeometry = (geometry: Geometry): IGeometry => {
//     return geometry;
// }