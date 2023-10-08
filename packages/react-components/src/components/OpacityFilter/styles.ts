"use client";
import styled from "styled-components";

import { OpacityFilterProps } from ".";

export const Styling = styled.div<OpacityFilterProps>`
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;

    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, ${({ opacity }) => opacity || 0.5});
`;
