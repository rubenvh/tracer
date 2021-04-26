import { SelectionTreeNodeComponent } from './selectionTreeNodeComponent';

const template = document.createElement('template');
template.innerHTML =  /*html*/`
<style> 
</style>
<selection-tree-node id="tree"></selection-tree-node>
`;

export class GeometrySelectionComponent extends HTMLElement {
    
    private tree: SelectionTreeNodeComponent;
    
    constructor() {
        super();
        // attach Shadow DOM to the parent element.
        // save the shadowRoot in a property because, if you create your shadow DOM in closed mode, 
        // you have no access from outside
        const shadowRoot = this.attachShadow({mode: 'closed'});
        // clone template content nodes to the shadow DOM
        shadowRoot.appendChild(template.content.cloneNode(true));
        //document.createElement('selection-tree-node')

        this.tree = shadowRoot.getElementById('tree') as SelectionTreeNodeComponent;

        shadowRoot.addEventListener('selected', (event) => {                    
          //event.stopPropagation();                          
          console.log(event);
          //this.tree.deselect();
          
        }, {capture: true, once: false, passive: false});
    } 

    set data (value) {
        this.tree.data = value;
    }
    
    
}

window.customElements.define('geometry-selection', GeometrySelectionComponent);