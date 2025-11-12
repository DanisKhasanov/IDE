export type ProjectTreeNode =
  | {
      id: string;
      name: string;
      path: string;
      type: 'file';
    }
  | {
      id: string;
      name: string;
      path: string;
      type: 'directory';
      children: ProjectTreeNode[];
    };

export type ProjectItem = {
  id: string;
  name: string;
  path: string;
  tree: Extract<ProjectTreeNode, { type: 'directory' }>;
};



