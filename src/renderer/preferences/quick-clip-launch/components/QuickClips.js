import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Accordion from 'react-bootstrap/Accordion';
import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import { Terms } from '../containers/Terms';
import { Tools } from '../containers/Tools';

export const QuickClips = ({
  autoScan,
  toolCount,
  toggleAutoScan,
  searchTermCount,
}) => (
  <Row>
    <Col style={{ paddingLeft: 0 }}>
      <Form>
        <Form.Check
          type="switch"
          id="auto-scan"
          label="Auto Scan clipboard"
          checked={autoScan}
          onChange={toggleAutoScan}
        />
      </Form>
      <Accordion defaultActiveKey="0">
        <Card>
          <Card.Header>
            <Accordion.Toggle as={Card.Title} style={{ marginBottom: '0'}} eventKey="tools">
              Tools <Badge variant="dark">{toolCount}</Badge><FontAwesomeIcon style={{ float: 'right' }} icon="angle-down" />
            </Accordion.Toggle>
          </Card.Header>
          <Accordion.Collapse eventKey="tools">
            <Card.Body style={{ padding: '.2rem' }}><Tools /></Card.Body>
          </Accordion.Collapse>
        </Card>
        <Card>
          <Card.Header>
            <Accordion.Toggle as={Card.Title} style={{ marginBottom: '0'}} eventKey="terms">
              Search Terms <Badge variant="dark">{searchTermCount}</Badge><FontAwesomeIcon style={{ float: 'right' }} icon="angle-down" />
            </Accordion.Toggle>
          </Card.Header>
          <Accordion.Collapse eventKey="terms">
            <Card.Body><Terms /></Card.Body>
          </Accordion.Collapse>
        </Card>
      </Accordion>
    </Col>
  </Row>
);

QuickClips.propTypes = {
  autoScan: PropTypes.bool.isRequired,
  toggleAutoScan: PropTypes.func.isRequired,
  toolCount: PropTypes.number.isRequired,
  searchTermCount: PropTypes.number.isRequired
};
