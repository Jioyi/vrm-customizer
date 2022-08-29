import * as React from 'react';
import { styled } from '@mui/material/styles';
import { alpha } from '@mui/material';
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';

const CustomTooltip = styled(({ className, ...props }: TooltipProps) => <Tooltip {...props} classes={{ popper: className }} />)(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
        backgroundColor: alpha(theme.palette.background.default, 0.8), // theme.palette.common.black
        color: theme.palette.text.primary,
        boxShadow: theme.shadows[1],
        fontSize: 12
    }
}));

export default CustomTooltip;
