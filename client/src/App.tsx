import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
// Material UI
import { makeStyles } from '@mui/styles';
// Views
import Customizer from './Views/Customizer';
import Test from './Views/Test';
// Components
import DialogSettings from './Components/DialogSettings/';

const useStyles = makeStyles(() => ({
    app: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#202225',
        padding: '0px',
        margin: '0px',
        height: '100%',
        width: '100%'
    }
}));

const App = () => {
    const classes = useStyles();

    return (
        <div className={classes.app}>
            <Router>
                <Routes>
                    <Route path="/" element={<Customizer />} />
                    <Route path="/demo" element={<Test />} />
                </Routes>
            </Router>
            <DialogSettings />
        </div>
    );
};

export default App;
