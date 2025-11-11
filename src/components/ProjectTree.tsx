import { Card, CardContent, CardHeader, Typography } from '@mui/material';

const ProjectTree = () => {
  return (
    <Card
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'none',
        border: 'none',
        backgroundColor: 'transparent',
        borderRight: 1, 
        borderColor: "divider",
      }}
    >
      <CardHeader title="Project Tree" />
      <CardContent
        sx={{
          flexGrow: 1,
          width: '100%',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Здесь появится структура проекта.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ProjectTree;

