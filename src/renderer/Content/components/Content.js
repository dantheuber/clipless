import React from 'react';
import Container from 'react-bootstrap/Container';
import { Clips } from '../../clips';
import { Header } from '../../header';

export const Content = () => (
  <Container fluid className="wrapper">
    <Header />
    <div className="main">
      <Clips />
    </div>
  </Container>
);
Content.displayName = 'Content';