/* eslint-disable import/prefer-default-export */
import styled from "styled-components";

import { OpacityFilterProps } from ".";

export const Styling = styled.div<OpacityFilterProps>`
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;

    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, ${({ opacity }) => opacity || 0.5});
`;
