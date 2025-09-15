import NavBar from '../Components/NavBar';

const PoseDetection = () => {
  return (
    <div className="flex flex-col w-screen h-screen">
      <NavBar />
      <iframe
        src="http://127.0.0.1:5000"
        title="Pose Detection Model"
        allowFullScreen="true"
        className="flex w-screen h-screen"
      ></iframe>
    </div>
  );
};

export default PoseDetection;
