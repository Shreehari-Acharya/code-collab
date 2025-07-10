export interface TreeViewElement {
    id: string;
    name: string;
    isSelectable: boolean;
    children?: TreeViewElement[];
}