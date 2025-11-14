import { styled } from "@mui/material/styles";

export const HandleGrip = styled("span")(({ theme }) => ({
    width: 2,
    height: "40%",
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.divider,
  }));
  