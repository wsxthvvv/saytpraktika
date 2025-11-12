import './AnimatedBackground.css';

const AnimatedBackground = ({ className = '' }) => {
  return (
    <div className={`animated-background ${className}`.trim()}>
      <div className="shape halo halo--one" />
      <div className="shape halo halo--two" />
      <div className="shape particle particle--a" />
      <div className="shape particle particle--b" />
      <div className="shape particle particle--c" />
      <div className="shape streak streak--one" />
      <div className="shape streak streak--two" />
    </div>
  );
};

export default AnimatedBackground;