import React from 'react';
import Container from 'react-bootstrap/Container';
import { NumberOfClips } from '../containers/NumberOfClips';
import { AlwaysOnTop } from '../containers/AlwaysOnTop';
import { EmptyLockedClips } from '../containers/EmptyLockedClips';
import { Transparent } from '../containers/Transparent';

export const GeneralPreferences = () => (
  <Container className="main">
    <NumberOfClips />
    <AlwaysOnTop />
    <EmptyLockedClips />
    <Transparent />
  </Container>
);
GeneralPreferences.propTypes = {};