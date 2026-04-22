import React from 'react';
import { FaSpinner } from 'react-icons/fa';
import '../styles/Loader.css';

// Shared loader component
const Loader = ({ size = 'medium', text = '', fullScreen = false }) => {
  const wrapperClass = fullScreen
    ? 'loader-wrapper loader-wrapper-fullscreen'
    : 'loader-wrapper';

  return (
    <div className={wrapperClass}>
      <div className={`loader-box loader-${size}`}>
        <FaSpinner className="loader-spinner" />
        {text ? <p className="loader-text">{text}</p> : null}
      </div>
    </div>
  );
};

export default Loader;