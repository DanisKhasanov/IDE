import { useState, useMemo, SyntheticEvent } from 'react';
import { Card, CardContent, Tabs, Tab } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MonacoEditor from '@monaco-editor/react';

const CodeEditorPanel = () => {
  const theme = useTheme();
  const editorTheme = theme.palette.mode === 'dark' ? 'vs-dark' : 'vs';
  const initialFiles = useMemo(
    () => [
      {
        id: 'main.c',
        label: 'main.c',
        language: 'c',
        content: `#include <stdio.h>

int main(void) {
    printf("Hello, Monaco!\\n");
    return 0;
}
`,
      },
      {
        id: 'utils.c',
        label: 'utils.c',
        language: 'c',
        content: `#include <stdio.h>

void greet(const char *name) {
    printf("Hello, %s!\\n", name);
}
`,
      },
    ],
    []
  );
  const [files, setFiles] = useState(initialFiles);
  const [activeFileId, setActiveFileId] = useState(initialFiles[0].id);

  const handleTabChange = (_event: SyntheticEvent, newValue: string) => {
    setActiveFileId(newValue);
  };

  const handleEditorChange = (value: string | undefined) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === activeFileId ? { ...file, content: value ?? '' } : file
      )
    );
  };

  const activeFile = files.find((file) => file.id === activeFileId);

  return (
    <Card
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        boxShadow: 'none',
        border: 'none',
        backgroundColor: theme.palette.background.paper,
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      <Tabs
        value={activeFileId}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {files.map((file) => (
          <Tab key={file.id} label={file.label} value={file.id} />
        ))}
      </Tabs>
      <CardContent sx={{ flex: 1, p: 1 }}>
        {activeFile && (
          <MonacoEditor
            language={activeFile.language}
            theme={editorTheme}
            height="100%"
            value={activeFile.content}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              automaticLayout: true,
              fontSize: 14,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default CodeEditorPanel;

