import './index.css';
import { Tilt } from './Tilt';

export default () => {
  return (
    <>
      <head>
        <meta charset="utf-8" />
        <title>Qwik Blank App</title>
      </head>
      <body>
        <Tilt>
          <div class="card"></div>
        </Tilt>
      </body>
    </>
  );
};
