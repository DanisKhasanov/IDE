import { Card, CardContent, CardHeader, Typography } from '@mui/material';

const InfoPanel = () => {
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
      }}
    >
      <CardHeader title="Info Panel" />
      <CardContent
        sx={{
          flexGrow: 1,
          width: '100%',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Дополнительная информация появится в этом окне.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default InfoPanel;

