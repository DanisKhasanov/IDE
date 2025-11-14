import { styled } from "@mui/material/styles";

export const HandleGrip = styled("span")(({ theme }) => ({
  width: 2,
  height: "40%",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.divider,
  transition: theme.transitions.create(["background-color"], {
    duration: theme.transitions.duration.short,
  }),
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));
  