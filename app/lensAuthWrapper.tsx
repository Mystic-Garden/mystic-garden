'use client'

import { useSession } from '@lens-protocol/react-web'; 
import { useEffect, useState } from 'react';
import ClipLoader from 'react-spinners/ClipLoader';

function LensAuthWrapper({ children }) {
  const { data: sessionData, loading } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!loading && sessionData?.authenticated) {
      setIsAuthenticated(true);
    }
  }, [loading, sessionData]);

  if (loading) return 
    <div className="flex justify-center items-center min-h-[300px]">
        <ClipLoader size={50} color={"#A07CFE"} loading={loading} />
    </div>;   
  
  return <>{children}</>;
}

export default LensAuthWrapper;
