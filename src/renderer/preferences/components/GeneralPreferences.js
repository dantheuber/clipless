import React from 'react';
import Row from 'react-bootstrap/Row';
import { NumberOfClips } from '../containers/NumberOfClips';
import { AlwaysOnTop } from '../containers/AlwaysOnTop';
import { EmptyLockedClips } from '../containers/EmptyLockedClips';
import { Transparent } from '../containers/Transparent';

export const GeneralPreferences = () => ([
  <Row key="header">
    <h3>Preferences</h3>
  </Row>,
  <NumberOfClips key="numberOfClips" />,
  <AlwaysOnTop key="alwaysOnTop" />,
  <EmptyLockedClips key="emptyLockedClips" />,
  <Transparent key="transparent" />
]);
GeneralPreferences.propTypes = {};