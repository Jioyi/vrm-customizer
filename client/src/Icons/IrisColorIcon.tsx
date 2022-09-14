import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const IrisColorIcon = (props: SvgIconProps) => {
    return (
        <SvgIcon {...props}>
            <path d="
            M12 4C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19S21.27 15.89 23 11.5C21.27 7.11 17 4 12 4Z
            M12 16.5C9.24 16.5 7 14.26 7 11.5S9.24 6.5 12 6.5 17 8.74 17 11.5 14.76 16.5 12 16.5Z
            M12 8.5C10.34 8.5 9 9.84 9 11.5S10.34 14.5 12 14.5 15 13.16 15 11.5 13.66 8.5 12 8.5Z
            M2 20H22V24H2V20Z"></path>
        </SvgIcon>
    );
};
export default IrisColorIcon;