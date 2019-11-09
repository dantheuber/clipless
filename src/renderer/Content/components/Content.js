import React from 'react';
import { Clips } from '../../clips';
import { Header } from '../../header';

export const Content = () => (
  <div className="Clipless-Clippings">
    <Header />
    <Clips />
  </div>
);
Content.displayName = 'Content';