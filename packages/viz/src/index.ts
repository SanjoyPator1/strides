export { Matrix, getMatrixSize } from './Matrix'
export type { MatrixProps, MatrixHighlight, MatrixHoverCell, MatrixGroup, MatrixSizeOptions } from './Matrix'

export { Scene, Step } from './Scene'
export type { SceneProps, StepProps } from './Scene'

export { useColorScale } from './color-scale'
export type { ColorScaleKind } from './color-scale'

export { useAnimatedNumber } from './animated-number'

export { ArrowOverlay, Anchor, Arrow, useAnchorRef } from './Arrow'
export type { ArrowOverlayProps, AnchorProps, ArrowProps } from './Arrow'

export { TensorSlices } from './TensorSlices'
export type { TensorSlicesProps, TensorSlice } from './TensorSlices'

export { TensorExplorer } from './TensorExplorer'
export type { TensorExplorerProps, TensorTree } from './TensorExplorer'

export { Tabs } from './Tabs'
export type { TabsProps } from './Tabs'

export { Node } from './Node'
export type { NodeProps, NodeShape } from './Node'

export { Group } from './Group'
export type { GroupProps } from './Group'

export { Flow } from './Flow'
export type { FlowProps, FlowExtraArrow } from './Flow'

export { Detail, DetailRail, DetailRailProvider } from './Detail'
export type { DetailProps, DetailRailProps, DetailRailProviderProps } from './Detail'

export { TensorDive, buildDiveTree, fitCamera, drillTargetPath, zoomLadder } from './TensorDive'
export type { TensorDiveProps, TensorDiveLevel, DiveTree, DiveNode } from './TensorDive'

export { BracketDiagram, layoutBracket, matchPath, runOpacity } from './BracketDiagram'
export type { BracketDiagramProps, BracketAnnotation, BracketRun, BracketLayout, BracketHover } from './BracketDiagram'

export { CATEGORICAL, DIM_COLORS, tint } from './palette'

export { seededRandom, roughEllipsePaths, roughArrowPaths } from './rough'
export type { RoughArrow } from './rough'
