import React from 'react';
import PropTypes from 'prop-types';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ListGroup from 'react-bootstrap/ListGroup';
import Accordion from 'react-bootstrap/Accordion';
import Badge from 'react-bootstrap/Badge';

export const QuickClipSelection = ({
  availableTools,
  selectTerm,
  unselectTerm,
  selectTool,
  unselectTool,
  launchSelected,
  cancelSelection,
  matchedTerms,
  selectedTools,
  selectedTerms,
  launchAll,
  getToolsForTerm,
  launchSingleTool
}) => {
  let defaultActiveKey = 'terms';
  if (matchedTerms.length === 1) {
    defaultActiveKey = 'tools';
  }
  return (
    <Row className="main">
      <Col style={{paddingBottom: '3rem'}}>
        <Accordion defaultActiveKey={defaultActiveKey}>
          <Card>
            <Card.Header>
              <Accordion.Toggle as={Card.Title} style={{ marginBottom: 0 }} eventKey="terms">
                Select Matched Terms <Badge variant="dark">{selectedTerms.length} / {matchedTerms.length}</Badge>
              </Accordion.Toggle>
            </Card.Header>
            <Accordion.Collapse eventKey="terms">
              <Card.Body className="qkSelectCardBody">
                <ListGroup variant="flush">
                  { matchedTerms.map((term, i) => {
                    const mGroups = Object.keys(term.match.groups);
                    const active = selectedTerms.includes(term);
                    return (
                      <ListGroup.Item action
                        key={`term-${i}-${term.match}`}
                        style={{ padding: 0 }}
                        active={active}
                        onClick={() => active ? unselectTerm(term) : selectTerm(term)}
                      >
                        <Card bg={active && "primary"}>
                          <Card.Title className="qkSelectTitle">{term.match[0]}</Card.Title>
                          <Card.Subtitle className="qkSelectSubtitle">Type: {term.term.name}</Card.Subtitle>
                          { mGroups.length > 1 &&
                            <Card.Body className="qkSelectCaptureGroups">
                              <Card.Text>Capture Groups:</Card.Text>
                              <ul>
                                { mGroups.map(group =>
                                  <li key={group}>
                                    {group}: {term.match.groups[group]}
                                  </li>
                                )}
                              </ul>
                            </Card.Body>
                          }
                          { active &&
                            <Card.Footer className="qkSelectFooter">
                              { getToolsForTerm(term.term).map(tool => (
                              <Card.Link
                                as={Button}
                                variant="light"
                                key={tool.name}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  launchSingleTool(tool, term);
                                }}
                              >{tool.name}</Card.Link>
                            ))}
                            </Card.Footer>
                          }
                        </Card>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              </Card.Body>
            </Accordion.Collapse>
          </Card>
          <Card>
            <Card.Header>
              <Accordion.Toggle as={Card.Title} style={{marginBottom:0}} eventKey="tools">
                Select Associated Tools <Badge variant="dark">{selectedTools.length} / {availableTools.length}</Badge>
              </Accordion.Toggle>
            </Card.Header>
            <Accordion.Collapse eventKey="tools">
              <Card.Body className="qkSelectCardBody">
                <ListGroup variant="flush">
                  { availableTools.map((tool, i) => {
                    const active = selectedTools.reduce((acc, t) => t.name === tool.name ? true : acc, false);
                    return (
                      <ListGroup.Item
                        action
                        key={`tool-${i}-${tool.name}`}
                        style={{ padding: 0 }}
                        active={active}
                        onClick={() => active ? unselectTool(tool) : selectTool(tool)}
                      >
                        <Card bg={active && "primary"}>
                          <Card.Title className="qkSelectTitle">{tool.name}</Card.Title>
                          <Card.Subtitle className="qkSelectSubtitle">URL - {tool.url}</Card.Subtitle>
                        </Card>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              </Card.Body>
            </Accordion.Collapse>
          </Card>
        </Accordion>
      </Col>
      <ButtonGroup className="prefsCloseButton">
        <Button variant="success" disabled={!selectedTools.length} onClick={launchSelected}>Launch Selected</Button>
        <Button variant="secondary" onClick={cancelSelection}>Cancel</Button>
        <Button variant="outline-success" onClick={launchAll}>Launch ALL</Button>
      </ButtonGroup>
    </Row>
  );
};

QuickClipSelection.propTypes = {
  selectTerm: PropTypes.func.isRequired,
  unselectTerm: PropTypes.func.isRequired,
  selectTool: PropTypes.func.isRequired,
  unselectTool: PropTypes.func.isRequired,
  launchSelected: PropTypes.func.isRequired,
  cancelSelection: PropTypes.func.isRequired,
  toolIsSelected: PropTypes.func.isRequired,
  termIsSelected: PropTypes.func.isRequired,
  launchAll: PropTypes.func.isRequired,
  launchSingleTool: PropTypes.func.isRequired,
  availableTools: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedTools: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedTerms: PropTypes.arrayOf(PropTypes.object).isRequired,
  matchedTerms: PropTypes.arrayOf(PropTypes.object).isRequired,
  getToolsForTerm: PropTypes.arrayOf(PropTypes.object).isRequired,
};
