import { useEffect, useState } from 'react';

const FALLBACK = '/catalog/miner-default.svg';

const ProductImage = ({ src, alt, className, loading }) => {
  const [url, setUrl] = useState(src || FALLBACK);

  useEffect(() => {
    setUrl(src || FALLBACK);
  }, [src]);

  return (
    <img
      className={className}
      src={url}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => {
        if (url !== FALLBACK) setUrl(FALLBACK);
      }}
    />
  );
};

export default ProductImage;