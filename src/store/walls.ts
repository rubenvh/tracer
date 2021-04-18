import { createPolygon as doCreatePolygon, IPolygon } from './../geometry/polygon';
import { IEntityKey } from './../geometry/entity';
import { IEdge } from './../geometry/edge';
import { IStoredGeometry, loadGeometry, IGeometry, transformEdges, moveVertices, removeVertex, addPolygon, duplicatePolygons, expandPolygon as doExpandPolygon, reversePolygon as doReversePolygon } from './../geometry/geometry';
import {splitEdge as makeEdgeSplit } from './../geometry/geometry';
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { EMPTY_GEOMETRY } from '../geometry/geometry';
import { Vector } from '../math/vector';
import { projectOn } from '../math/lineSegment';
import { IVertexMap } from '../geometry/vertex';
// Slice
export type IWallState = {geometry: IGeometry, disableUndo?: boolean }
const slice = createSlice({
  name: 'walls',
  initialState: {      
      geometry: EMPTY_GEOMETRY,  
  } as IWallState,
  reducers: {
    loadWalls: (state, action: PayloadAction<IStoredGeometry>) => {
        state.geometry = loadGeometry(action.payload)
    },
    updateWalls: (state, action: PayloadAction<IGeometry>) => {
        state.geometry = action.payload;
    },
    adaptEdges: (state, action: PayloadAction<{edgeMap: Map<IEntityKey, IEdge[]>, transformer: (_: IEdge) => IEdge}>) => {
        const updatedEdges = Array.from(action.payload.edgeMap.entries())
            .reduce((geo, [poligonId, edges]) => transformEdges(edges, poligonId, action.payload.transformer, geo), state.geometry);
        state.geometry = updatedEdges;
    },
    splitEdge: (state, action: PayloadAction<{edge: IEdge, poligon: IEntityKey, target: Vector}>) => {
      const cut = projectOn(action.payload.target, action.payload.edge.segment);
      state.geometry = makeEdgeSplit(cut, action.payload.edge, action.payload.poligon, state.geometry);
    },
    move: (state, action: PayloadAction<{direction: Vector, verticesMap: IVertexMap, snap: boolean, disableUndo?: boolean}>) => {      
      state.disableUndo = action.payload.disableUndo;
      state.geometry = moveVertices(action.payload.snap, action.payload.direction, action.payload.verticesMap, state.geometry);
    },
    remove: (state, action: PayloadAction<IVertexMap>) => {      
      state.geometry = Array.from(action.payload.entries())
        .reduce((acc, [polygon, vertices]) => 
          vertices.reduce((_, vertex) => removeVertex(vertex, polygon, _), acc), 
          state.geometry);
    },
    createPolygon: (state, action: PayloadAction<Vector[]>) => {
      state.geometry = addPolygon(doCreatePolygon(action.payload), state.geometry);
    },
    clonePolygon: (state, action: PayloadAction<{polygons: IPolygon[], displacementIndex? : number}>) => {
      const displacement = (action.payload.displacementIndex??1) * 10;
      [state.geometry, ] = duplicatePolygons(
        action.payload.polygons, 
        [displacement, displacement], 
        state.geometry);
    },
    expandPolygon: (state, action: PayloadAction<{edge: IEdge, polygon: IEntityKey, direction: Vector}>) => {
      const {edge, polygon, direction} = action.payload;
      [,state.geometry] = doExpandPolygon(edge, polygon, direction, state.geometry);
    },
    reversePolygon: (state, action: PayloadAction<IEntityKey[]>) => {
      state.geometry = doReversePolygon(action.payload, state.geometry);
    }
  },
});
export default slice.reducer
// Actions
export const { loadWalls, updateWalls, adaptEdges, splitEdge, move, remove, createPolygon, clonePolygon, expandPolygon, reversePolygon } = slice.actions