import React from "react";
import { Dispatch } from "redux";
import { Wizard, Spinner } from "@patternfly/react-core";
import { connect } from "react-redux";

import { ApplicationState } from "../../../store/root/applicationState";
import "./styles/AddNode.scss";

import Review from "./Review";
import { addNodeRequest } from "../../../store/feed/actions";
import { Plugin, PluginInstance } from "@fnndsc/chrisapi";
import { Button } from "@patternfly/react-core";
import { PlusCircleIcon } from "@patternfly/react-icons";
import { getParams } from "../../../store/plugin/actions";
import GuidedConfig from "./GuidedConfig";
import Editor from "./Editor";
import BasicConfiguration from "./BasicConfiguration";
import { AddNodeState, AddNodeProps, InputType, InputIndex } from "./types";
import { getRequiredObject } from "../CreateFeed/utils/createFeed";

function getInitialState() {
  return {
    isOpen: false,
    stepIdReached: 1,
    nodes: [],
    data: {},
    requiredInput: {},
    dropdownInput: {},
    selectedComputeEnv: "",
    errors: {},
  };
}

const AddNode: React.FC<AddNodeProps> = ({
  selectedPlugin,
  pluginInstances,
  getParams,
  addNode,
}: AddNodeProps) => {
  const [addNodeState, setNodeState] = React.useState<AddNodeState>(
    getInitialState
  );
  const {
    isOpen,
    stepIdReached,
    nodes,
    data,
    requiredInput,
    dropdownInput,
    selectedComputeEnv,
    errors,
  } = addNodeState;

  const handleFetchedData = React.useCallback(() => {
    if (pluginInstances) {
      const { data: nodes } = pluginInstances;
      setNodeState((addNodeState) => {
        return {
          ...addNodeState,
          nodes,
          data: {
            ...addNodeState.data,
            parent: selectedPlugin,
          },
        };
      });
    }
  }, [pluginInstances, selectedPlugin]);

  React.useEffect(() => {
    handleFetchedData();
  }, [handleFetchedData]);

  const inputChange = (
    id: string,
    flag:string,
    value: string,
    type: string,
    placeholder: string,
    required: boolean
  ) => {
    const input: InputIndex = {};
    input["value"] = value;
    input['flag']=flag;
    input["type"] = type;
    input["placeholder"] = placeholder;

    if (required === true) {
      setNodeState({
        ...addNodeState,
        requiredInput: {
          ...addNodeState.requiredInput,
          [id]: input,
        },
        errors: {},
      });
    } else {
      setNodeState({
        ...addNodeState,
        dropdownInput: {
          ...addNodeState.dropdownInput,
          [id]: input,
        },
        errors: {},
      });
    }
  };

  const inputChangeFromEditor = (
    dropdownInput: InputType,
    requiredInput: InputType
  ) => {
    setNodeState((prevState) => ({
      ...prevState,
      dropdownInput: dropdownInput,
      errors: {},
    }));

    setNodeState((prevState) => ({
      ...prevState,
      requiredInput: requiredInput,
      errors: {},
    }));
  };

  const toggleOpen = () => {
    resetState();
  };

  const onNext = (newStep: { id?: string | number; name: React.ReactNode }) => {
    const { stepIdReached } = addNodeState;
    const { id } = newStep;
    id &&
      setNodeState({
        ...addNodeState,
        stepIdReached: stepIdReached < id ? (id as number) : stepIdReached,
      });
  };

  const onBack = (newStep: { id?: string | number; name: React.ReactNode }) => {
    const { id } = newStep;

    id && id === 1
      ? setNodeState({
          ...addNodeState,
          dropdownInput: {},
          requiredInput: {},
          stepIdReached: stepIdReached > id ? (id as number) : stepIdReached,
        })
      : id &&
        setNodeState({
          ...addNodeState,
          stepIdReached: stepIdReached > id ? (id as number) : stepIdReached,
        });
  };

  const handlePluginSelect = (plugin: Plugin) => {
    setNodeState((prevState) => ({
      ...prevState,
      data: { ...prevState.data, plugin },
    }));
    getParams(plugin);
  };

  const setComputeEnv = React.useCallback((computeEnv: string) => {
    setNodeState((addNodeState) => {
      return {
        ...addNodeState,
        selectedComputeEnv: computeEnv,
      };
    });
  }, []);

  const deleteInput = (input: string) => {
    const { dropdownInput } = addNodeState;

    const newObject = Object.entries(dropdownInput)
      .filter(([key]) => {
        return key !== input;
      })
      .reduce((acc: InputType, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    setNodeState({
      ...addNodeState,
      dropdownInput: newObject,
    });
  };

  const resetState = () => {
    setNodeState({
      isOpen: !isOpen,
      stepIdReached: 1,
      nodes: [],
      data: {},
      dropdownInput: {},
      requiredInput: {},
      errors: {},
      selectedComputeEnv: "",
    });
  };

  const handleSave = async () => {
    const { dropdownInput, requiredInput, selectedComputeEnv } = addNodeState;
    const { plugin } = addNodeState.data;

    if (!plugin || !selectedPlugin || !pluginInstances) {
      return;
    }
    const { data: nodes } = pluginInstances;

    let parameterInput = await getRequiredObject(
      dropdownInput,
      requiredInput,
      plugin,
      selectedPlugin
    );

    parameterInput = {
      ...parameterInput,
      compute_resource_name: selectedComputeEnv,
    };

    const pluginInstance = await plugin.getPluginInstances();

    try {
      await pluginInstance.post(parameterInput);
      const node = pluginInstance.getItems()[0];
      addNode({
        pluginItem: node,
        nodes,
      });
      resetState();
    } catch (error) {
      setNodeState({
        ...addNodeState,
        errors: error.response.data,
      });
    }
  };

  const basicConfiguration = selectedPlugin && nodes && (
    <BasicConfiguration
      selectedPlugin={addNodeState.data.plugin}
      parent={selectedPlugin}
      nodes={nodes}
      handlePluginSelect={handlePluginSelect}
    />
  );
  const form = data.plugin ? (
    <GuidedConfig
      inputChange={inputChange}
      deleteInput={deleteInput}
      plugin={data.plugin}
      dropdownInput={dropdownInput}
      requiredInput={requiredInput}
      selectedComputeEnv={selectedComputeEnv}
      setComputeEnviroment={setComputeEnv}
    />
  ) : (
    <Spinner size="xl" />
  );

  const editor = data.plugin ? (
    <Editor
      plugin={data.plugin}
      inputChange={inputChange}
      dropdownInput={dropdownInput}
      requiredInput={requiredInput}
      inputChangeFromEditor={inputChangeFromEditor}
    />
  ) : (
    <Spinner size="xl" />
  );

  const review = data.plugin ? (
    <Review
      parent={selectedPlugin}
      currentPlugin={data.plugin}
      dropdownInput={dropdownInput}
      requiredInput={requiredInput}
      computeEnvironment={selectedComputeEnv}
      errors={errors}
    />
  ) : (
    <Spinner size="xl" />
  );

  const steps = [
    {
      id: 1,
      name: "Plugin Selection",
      component: basicConfiguration,
      enableNext: !!data.plugin,
      canJumpTo: stepIdReached > 1,
    },
    {
      id: 2,
      name: "Plugin Configuration-Form",
      component: form,
      canJumpTo: stepIdReached > 2,
    },
    {
      id: 3,
      name: "Plugin Configuration-Editor",
      component: editor,
      canJumpTo: stepIdReached > 3,
    },
    {
      id: 4,
      name: "Review",
      component: review,
      nextButtonText: "Add Node",
      canJumpTo: stepIdReached > 4,
    },
  ];

  return (
    <React.Fragment>
      <Button icon={<PlusCircleIcon />} type="button" onClick={toggleOpen}>
        Add a Child Node
      </Button>
      {isOpen && (
        <Wizard
          isOpen={isOpen}
          onClose={toggleOpen}
          title="Add a New Node"
          description="This wizard allows you to add a node to a feed"
          onSave={handleSave}
          steps={steps}
          onNext={onNext}
          onBack={onBack}
        />
      )}
    </React.Fragment>
  );
};

const mapStateToProps = (state: ApplicationState) => ({
  selectedPlugin: state.feed.selectedPlugin,
  pluginInstances: state.feed.pluginInstances,
  loadingAddNode: state.feed.loadingAddNode,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  getParams: (plugin: Plugin) => dispatch(getParams(plugin)),
  addNode: (item: { pluginItem: PluginInstance; nodes?: PluginInstance[] }) =>
    dispatch(addNodeRequest(item)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AddNode);
