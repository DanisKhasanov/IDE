import { Box, Typography, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import { Panel, PanelResizeHandle } from 'react-resizable-panels';
import { HandleGrip } from '@utils/HandleGrip';

interface TerminalPanelProps {
  isVisible: boolean;
  onClose?: () => void;
}

const TerminalPanel = ({ isVisible, onClose }: TerminalPanelProps) => {
  const theme = useTheme();

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <PanelResizeHandle>
        <HandleGrip />
      </PanelResizeHandle>
      <Panel defaultSize={30} minSize={15} maxSize={70}>
        <Box
          display="flex"
          flexDirection="column"
          height="100%"
          bgcolor={theme.palette.background.paper}
          borderTop={1}
          borderColor="divider"
        >
          {/* Заголовок с кнопкой закрытия */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" sx={{ px: 1, color: theme.palette.text.secondary }}>
              Терминал
            </Typography>
            {onClose && (
              <IconButton
                size="small"
                onClick={onClose}
                aria-label="Закрыть терминал"
                sx={{ p: 0.5 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          {/* Контент терминала */}
          <Box
            sx={{
              flex: 1,
              width: '100%',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.palette.text.secondary,
            }}
          >
            <Typography variant="body2">
              Терминал (будет интегрирован позже)
            </Typography>
          </Box>
        </Box>
      </Panel>
    </>
  );
};

export default TerminalPanel;

