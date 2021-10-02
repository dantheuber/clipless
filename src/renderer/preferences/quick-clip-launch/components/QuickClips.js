import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Accordion from 'react-bootstrap/Accordion';
import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FilePicker } from 'react-file-picker';
import Overlay from 'react-bootstrap/Overlay';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Button from 'react-bootstrap/Button';

import { Terms } from '../containers/Terms';
import { Tools } from '../containers/Tools';

export const QuickClips = ({
  autoScan,
  toolCount,
  toggleAutoScan,
  searchTermCount,
  importQuickClips,
  exportQuickClips,
}) => {
  const [show, setShow] = useState(false);
  const [target, setTarget] = useState(null);
  const ref = useRef(null);

  const mouseEnter = ({ target }) => {
    setTarget(target);
    setShow(true);
  };
  const mouseLeave = () => setShow(false);
  return (
    [<Row key="quick-clip-options">
      <Col style={{ paddingLeft: 0 }}>
        <Form>
          <Form.Check
            type="switch"
            id="auto-scan"
            label="Scan clipboard on change"
            checked={autoScan}
            onChange={toggleAutoScan}
          />
        </Form>
      </Col>
      <Col>
        <ButtonToolbar style={{ float: 'right', margin: '3px'}}>
          <ButtonGroup className="mr-2">
            <OverlayTrigger
              placement="left"
              overlay={<Tooltip id="export-qk">Export Quick Clips</Tooltip>}
            >
              <Button variant="info" onClick={exportQuickClips}>
                <FontAwesomeIcon icon="download" />
              </Button>
            </OverlayTrigger>
            <Overlay show={show} target={target} placement="left">
              <Tooltip id="import">Import Quick Clips</Tooltip>
            </Overlay>
            <FilePicker
              extensions={['json']}
              onChange={importQuickClips}
              onError={alert}
            >
              <Button variant="info" ref={ref} onMouseEnter={mouseEnter} onMouseLeave={mouseLeave}>
                <FontAwesomeIcon icon="file-import" />
              </Button>
            </FilePicker>
          </ButtonGroup>
        </ButtonToolbar>
      </Col>
    </Row>,
    <Row key="quick-clip-accordion">
      <Col style={{ paddingLeft: 0, marginBottom: '5rem' }}>
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
              <Card.Body style={{ padding: '.2rem' }}><Terms /></Card.Body>
            </Accordion.Collapse>
          </Card>
        </Accordion>
      </Col>
    </Row>]
  );
};

QuickClips.propTypes = {
  autoScan: PropTypes.bool.isRequired,
  toggleAutoScan: PropTypes.func.isRequired,
  toolCount: PropTypes.number.isRequired,
  searchTermCount: PropTypes.number.isRequired,
  exportQuickClips: PropTypes.func.isRequired,
  importQuickClips: PropTypes.func.isRequired,
};
