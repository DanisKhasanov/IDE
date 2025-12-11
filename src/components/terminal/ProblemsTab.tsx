import { Box, Typography, List, ListItem, ListItemText } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";

export interface CompilationProblem {
  type: "error" | "warning";
  file?: string;
  line?: number;
  column?: number;
  message: string;
  raw?: string; // Исходная строка ошибки
}

interface ProblemsTabProps {
  problems: CompilationProblem[];
}

const ProblemsTab = ({ problems }: ProblemsTabProps) => {
  const theme = useTheme();

  if (problems.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: theme.palette.text.secondary,
        }}
      >
        <Typography variant="body2">Нет проблем</Typography>
      </Box>
    );
  }

  const errors = problems.filter((p) => p.type === "error");
  const warnings = problems.filter((p) => p.type === "warning");

  return (
    <Box
      sx={{
        height: "100%",
        overflow: "auto",
        backgroundColor: theme.palette.background.paper,
      }}
    >
      {errors.length > 0 && (
        <Box>
          <List dense>
            {errors.map((problem, index) => (
              <ListItem
                key={index}
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  "&:hover": {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <ErrorIcon
                  sx={{
                    color: theme.palette.error.main,
                    mr: 1,
                    fontSize: 20,
                  }}
                />
                <ListItemText
                  primary={
                    <Box>
                      {problem.file && (
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ fontWeight: "bold", mr: 1 }}
                        >
                          {problem.file}
                          {problem.line !== undefined && `:${problem.line}`}
                          {problem.column !== undefined && `:${problem.column}`}
                        </Typography>
                      )}
                      <Typography component="span" variant="body2">
                        {problem.message}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {warnings.length > 0 && (
        <Box>
          <Typography
            variant="subtitle2"
            sx={{
              px: 2,
              py: 1,
              backgroundColor: theme.palette.warning.dark,
              color: theme.palette.warning.contrastText,
              fontWeight: "bold",
            }}
          >
            Предупреждения ({warnings.length})
          </Typography>
          <List dense>
            {warnings.map((problem, index) => (
              <ListItem
                key={index}
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  "&:hover": {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <WarningIcon
                  sx={{
                    color: theme.palette.warning.main,
                    mr: 1,
                    fontSize: 20,
                  }}
                />
                <ListItemText
                  primary={
                    <Box>
                      {problem.file && (
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ fontWeight: "bold", mr: 1 }}
                        >
                          {problem.file}
                          {problem.line !== undefined && `:${problem.line}`}
                          {problem.column !== undefined && `:${problem.column}`}
                        </Typography>
                      )}
                      <Typography component="span" variant="body2">
                        {problem.message}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default ProblemsTab;
